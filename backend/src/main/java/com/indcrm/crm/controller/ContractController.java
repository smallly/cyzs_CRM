package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.service.ContractService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;

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
                req.signDate()
        ));
    }

    @GetMapping
    public ApiResponse<?> list() {
        return ApiResponse.ok(contractService.list(sessionService.requireUser()));
    }

    public record CreateReq(String projectId, String contractNo, String title, BigDecimal amount, LocalDate signDate) {}
}
