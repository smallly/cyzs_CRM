package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.service.ContractService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {
    private final SessionService sessionService;
    private final ContractService contractService;

    public ContractController(SessionService sessionService, ContractService contractService) {
        this.sessionService = sessionService;
        this.contractService = contractService;
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateReq req) {
        return ApiResponse.ok(contractService.create(
                sessionService.requireUser(),
                req.projectId(),
                req.contractNo(),
                req.title(),
                req.amount(),
                parseLocalDate(req.signDate()),
                req.estimatedCommission(),
                parseLocalDate(req.leaseStartDate()),
                parseLocalDate(req.leaseEndDate()),
                req.leaseTermMonths(),
                req.paymentTerms(),
                req.attachment()
        ));
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return ApiResponse.ok(PageUtils.maybePaginate(contractService.list(sessionService.requireUser()), page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> get(@PathVariable("id") String id) {
        return ApiResponse.ok(contractService.mustGet(sessionService.requireUser(), id));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable("id") String id, @RequestBody UpdateReq req) {
        return ApiResponse.ok(contractService.update(
                sessionService.requireUser(),
                id,
                req.projectId(),
                req.contractNo(),
                req.title(),
                req.amount(),
                parseLocalDate(req.signDate()),
                req.estimatedCommission(),
                parseLocalDate(req.leaseStartDate()),
                parseLocalDate(req.leaseEndDate()),
                req.leaseTermMonths(),
                req.paymentTerms(),
                req.attachment()
        ));
    }

    @PutMapping("/{id}/sign-date")
    public ApiResponse<?> updateSignDate(@PathVariable("id") String id, @RequestBody SignDateReq req) {
        return ApiResponse.ok(contractService.updateSignDate(
                sessionService.requireUser(),
                id,
                parseLocalDate(req.signDate())
        ));
    }

    public record CreateReq(
            String projectId,
            String contractNo,
            String title,
            BigDecimal amount,
            String signDate,
            BigDecimal estimatedCommission,
            String leaseStartDate,
            String leaseEndDate,
            Integer leaseTermMonths,
            String paymentTerms,
            String attachment
    ) {}

    public record UpdateReq(
            String projectId,
            String contractNo,
            String title,
            BigDecimal amount,
            String signDate,
            BigDecimal estimatedCommission,
            String leaseStartDate,
            String leaseEndDate,
            Integer leaseTermMonths,
            String paymentTerms,
            String attachment
    ) {}

    public record SignDateReq(String signDate) {}

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
