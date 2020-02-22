#lang racket

(require json)
(require rnrs/base-6)

(define PYTHON-FILE "measurements_py.json")
(define RACKET-FILE "measurements_rkt.json")

(define python-json (call-with-input-file PYTHON-FILE read-json))
(define racket-json (call-with-input-file RACKET-FILE read-json))

(assert (equal? python-json racket-json))
