#lang racket

(require racket/hash)
(require (only-in srfi/13 string-contains))
(require json)

(require gregor)
(require simple-xlsx)

;; The Excel document to read and JSON file to write
(define XLSX-FILE "measurements.xlsx")
(define RESULTS-FILE "measurements_rkt.json")

;; Column and row indexes of relevant data
(define DATE-ROW-INDEX 6)
(define FIRST-DATE-COLUMN-INDEX 6)
(define LOCATION-COLUMN-INDEX 2)
(define LOCATIONS-RANGE (in-range 7 18))

;; Create a date struct from an xlsx date number
(define (build-date xlsx-date)
  (let ([date_val (oa_date_number->date xlsx-date)])
    (-days
      (date
        (date-year date_val)
        (date-month date_val)
        (date-day date_val))
      1)))

;; Create a symbol from a date in the format 2020-02-15
(define (build-date-key date)
  (string->symbol (~t date "y-MM-dd")))

;; Create a location name for use as a hash table key
(define (build-location location)
  (string->symbol (string-replace (string-downcase location) " " "-")))

;; Ensure a measurement taken from a spreadsheet is a number.
;; NT is used to represent 'Not tested' and some cells
;; contain '<1' instead of holding a decimal value.
(define (cleanse-measurement measurement)
  (match measurement
    [(regexp #rx"^<|^>")
     (string->number (string-replace measurement #rx"<|>|," ""))]
    ["NT" -1]
    [else measurement]))

(define (read-sheet sheet-name xlsx)
  ;; Load the spreadsheet for reading
  (load-sheet sheet-name xlsx)

  ;; Read all rows from the spreadsheet and locate the relevant data
  (define data (get-sheet-rows xlsx))
  (define dates-row (list-ref data DATE-ROW-INDEX))
  (define location-rows
    (for/list
      ([index LOCATIONS-RANGE])
      (list-ref data index)))

  ;; Create a list of dates for all measurements
  (define dates
    (map
      build-date
      (remq* '("") (list-tail dates-row FIRST-DATE-COLUMN-INDEX))))

  ;; Create a list of locations
  (define locations
    (for/list
      ([row location-rows])
      (build-location (list-ref row LOCATION-COLUMN-INDEX))))

  ;; Read measurements for a given date column
  (define (measurements-for-date column-offset)
    (for/list
      ([row location-rows])
      (cleanse-measurement
        (list-ref row (+ FIRST-DATE-COLUMN-INDEX column-offset)))))

  (define (measurement-for-date-location date-offset location-index)
    (cleanse-measurement
      (list-ref
        (list-ref location-rows location-index)
        (+ FIRST-DATE-COLUMN-INDEX date-offset))))

  ;; Build a hash table keyed by measurement date with values being
  ;; hash tables of location and measurement pairs.
  (for/hash
    ([date-index (in-range 0 (length dates))])
    (values
      (build-date-key (list-ref dates date-index))
      (make-hash
        (map cons locations (measurements-for-date date-index))))))

;; Return a list of sheet names that contain measurement results
(define (get-result-sheets xlsx)
  (filter
    (λ (sheet) (string-contains sheet "result"))
    (get-sheet-names xlsx)))

;; The hash table which will store all of the results
(define results (make-hash))

;; Open the document and read data from all result sheets
(with-input-from-xlsx-file
    XLSX-FILE
    (λ (xlsx)
      (for
        ([sheet-name (get-result-sheets xlsx)])
        (hash-union! results (read-sheet sheet-name xlsx)))))

;; Output the results as json
(call-with-output-file
  RESULTS-FILE
  (λ (output-port) (write-json results output-port))
  #:exists 'replace)
