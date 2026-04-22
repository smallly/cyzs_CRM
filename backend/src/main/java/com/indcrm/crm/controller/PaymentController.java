package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.service.PaymentService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final SessionService sessionService;
    private final PaymentService paymentService;

    public PaymentController(SessionService sessionService, PaymentService paymentService) {
        this.sessionService = sessionService;
        this.paymentService = paymentService;
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateReq req) {
        return ApiResponse.ok(paymentService.create(
                sessionService.requireUser(),
                req.contractId(),
                parseLocalDate(req.paidDate()),
                req.amount(),
                req.invoiceStatus()
        ));
    }

    @GetMapping
    public ApiResponse<?> list() {
        return ApiResponse.ok(paymentService.list(sessionService.requireUser()));
    }

    public record CreateReq(String contractId, String paidDate, BigDecimal amount, String invoiceStatus) {}

    private LocalDate parseLocalDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
