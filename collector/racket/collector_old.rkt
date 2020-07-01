#lang racket

(require (only-in srfi/13 string-contains))

(require gregor)
(require simple-xlsx)

;; The Excel document to read
(define xlsx-file "measurements.xlsx")

;; Column letters and row numbers of key information
;; in the spreadsheet.
(define date-row 7)
(define first-date-col 7)
(define location-col 3)
(define first-location-row 8)
(define last-location-row 18)

(define columns
  (vector "A" "B" "C" "D" "E" "F" "G" "H" "I" "J" "K" "L" "M"
          "N" "O" "P" "Q" "R" "S" "T" "U" "V" "W" "X" "Y" "Z"))

;; Translate a column number to a column letter.
;; 1 is A, 2 is B, 3 is C, etc.
;;
;; TODO: Be safe and put a max on col-number.
;;       Also, handle BA-BZ, CA-CZ, etc, using
;;       (quotient/remainder col-number 26).
(define (col-number-to-letter col-number)
  (if (<= col-number (vector-length columns))
      (vector-ref columns (sub1 col-number))
      (string-append
        "A"
        (vector-ref columns (sub1 (modulo col-number (vector-length columns)))))))

;; Return a Letter:Number cell reference from numerical cell coordinates
(define (cell-ref column row)
  (string-append (col-number-to-letter column) (number->string row)))

;; Return the value in a cell, given the numerical cell coordinates
(define (cell-value xlsx column row)
  (get-cell-value (cell-ref column row) xlsx))

;; Return the value in a cell that contains a date
(define (date-cell-value xlsx column row)
  (date-from-xlsx-format (cell-value xlsx column row)))

;; Create a date struct from an xlsx date number
(define (date-from-xlsx-format xlsx-date)
  (let ([date_val (oa_date_number->date xlsx-date)])
    (-days
      (date
        (date-year date_val)
        (date-month date_val)
        (date-day date_val))
      1)))

;; Ensure a measurement taken from a spreadsheet is a number.
;; NT is used to represent 'Not tested' and some cells
;; contain '<1' instead of holding a decimal value.
(define (cleanse-measurement measurement)
  (match measurement
    [(regexp #rx"^<") (string->number (string-replace measurement "<" ""))]
    ["NT" -1]
    [else measurement]))

;; Return a list of sheet names that contain measurement results
(define (get-result-sheets xlsx)
  (filter
    (λ (sheet) (string-contains sheet "result"))
    (get-sheet-names xlsx)))

(define (read-xlsx document)
  ;; Create the hash table for storing the results
  (define results (make-hash))

  (with-input-from-xlsx-file
    document
    (λ (xlsx)
      ;; Loop over the result sheets in the xlsx document
      (for ([sheet (get-result-sheets xlsx)])
        ;; Load the sheet for reading
        (load-sheet sheet xlsx)

        ;; Get the number of columns in the sheet. Not sure how
        ;; this works because columns without data are returned.
        (define num-cols (cdr (get-sheet-dimension xlsx)))

        ;; Loop over each date cell and over each location
        (for* (
          [date-index (in-range first-date-col (add1 num-cols))]
          [location-index (in-range first-location-row (add1 last-location-row))]
          #:unless (equal? (cell-value xlsx date-index date-row) ""))

          ;; Get the date from the date cell and the location name from the location cell
          (define date-value (date-cell-value xlsx date-index date-row))
          (define location-name (cell-value xlsx location-col location-index))
          (define measurement (cleanse-measurement (cell-value xlsx date-index location-index)))

          (define date-key (~t date-value "y-MM"))
          (define location-key (string-replace (string-downcase location-name) " " "-"))

          (if (hash-has-key? results date-key)
              (let ([locations (hash-ref results date-key)])
                 (if (hash-has-key? locations location-key)
                    (hash-update! locations location-key (λ (value) (max measurement value)))
                    (hash-set! locations location-key measurement)))
              (hash-set! results date-key (make-hash (list (cons location-key measurement)))))))))
  results)

(define data (read-xlsx xlsx-file))
(display data)
