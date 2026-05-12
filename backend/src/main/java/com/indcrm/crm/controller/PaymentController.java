package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
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
                req.payerName(),
                req.invoiceStatus(),
                req.voucher(),
                req.remark()
        ));
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return ApiResponse.ok(PageUtils.maybePaginate(paymentService.list(sessionService.requireUser()), page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> get(@PathVariable("id") String id) {
        return ApiResponse.ok(paymentService.get(sessionService.requireUser(), id));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable("id") String id, @RequestBody UpdateReq req) {
        return ApiResponse.ok(paymentService.update(
                sessionService.requireUser(),
                id,
                req.contractId(),
                parseLocalDate(req.paidDate()),
                req.amount(),
                req.payerName(),
                req.invoiceStatus(),
                req.voucher(),
                req.remark()
        ));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(@PathVariable("id") String id) {
        paymentService.delete(sessionService.requireUser(), id);
        return ApiResponse.ok("ok");
    }

    @PutMapping("/{id}/paid-date")
    public ApiResponse<?> updatePaidDate(@PathVariable("id") String id, @RequestBody PaidDateReq req) {
        return ApiResponse.ok(paymentService.updatePaidDate(
                sessionService.requireUser(),
                id,
                parseLocalDate(req.paidDate())
        ));
    }

    public record CreateReq(
            String contractId,
            String paidDate,
            BigDecimal amount,
            String payerName,
            String invoiceStatus,
            String voucher,
            String remark
    ) {}

    public record UpdateReq(
            String contractId,
            String paidDate,
            BigDecimal amount,
            String payerName,
            String invoiceStatus,
            String voucher,
            String remark
    ) {}

    public record PaidDateReq(String paidDate) {}

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
