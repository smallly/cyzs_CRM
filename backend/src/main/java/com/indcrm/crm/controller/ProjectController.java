package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.domain.ProjectDealType;
import com.indcrm.crm.domain.ProjectStage;
import com.indcrm.crm.service.ProjectService;
import com.indcrm.crm.service.SessionService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/projects")
@Validated
public class ProjectController {
    private final SessionService sessionService;
    private final ProjectService projectService;

    public ProjectController(SessionService sessionService, ProjectService projectService) {
        this.sessionService = sessionService;
        this.projectService = projectService;
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateReq req) {
        return ApiResponse.ok(projectService.create(
                sessionService.requireUser(),
                req.name(),
                req.contactId(),
                req.ownerId(),
                req.dealType(),
                req.level(),
                req.source(),
                req.intendedRegion(),
                resolveAreaMin(req.intendedAreaMin(), req.intendedAreaMax(), req.intendedArea()),
                resolveAreaMax(req.intendedAreaMin(), req.intendedAreaMax(), req.intendedArea()),
                req.firstContactAt(),
                req.firstVisitDate(),
                req.firstNegotiationDate(),
                req.movedInDate(),
                req.remark()
        ));
    }

    @GetMapping
    public ApiResponse<?> list() {
        return ApiResponse.ok(projectService.list(sessionService.requireUser()));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable String id, @RequestBody UpdateReq req) {
        return ApiResponse.ok(projectService.updateBasicInfo(
                sessionService.requireUser(),
                id,
                req.name(),
                req.dealType(),
                req.level(),
                req.source(),
                req.intendedRegion(),
                resolveAreaMin(req.intendedAreaMin(), req.intendedAreaMax(), req.intendedArea()),
                resolveAreaMax(req.intendedAreaMin(), req.intendedAreaMax(), req.intendedArea()),
                req.remark()
        ));
    }

    @PutMapping("/{id}/stage")
    public ApiResponse<?> stage(@PathVariable String id, @RequestBody StageReq req) {
        return ApiResponse.ok(projectService.updateStage(sessionService.requireUser(), id, req.stage()));
    }

    @PutMapping("/{id}/owner")
    public ApiResponse<Void> transfer(@PathVariable String id, @RequestBody TransferReq req) {
        projectService.transferOwner(sessionService.requireUser(), id, req.ownerId(), req.reason());
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        projectService.delete(sessionService.requireUser(), id);
        return ApiResponse.ok(null);
    }

    public record CreateReq(
            @NotBlank String name,
            @NotBlank String contactId,
            @NotBlank String ownerId,
            ProjectDealType dealType,
            String level,
            String source,
            String intendedRegion,
            Double intendedAreaMin,
            Double intendedAreaMax,
            // legacy single-value field
            Double intendedArea,
            LocalDateTime firstContactAt,
            LocalDate firstVisitDate,
            LocalDate firstNegotiationDate,
            LocalDate movedInDate,
            String remark
    ) {}

    public record UpdateReq(
            @NotBlank String name,
            ProjectDealType dealType,
            String level,
            String source,
            String intendedRegion,
            Double intendedAreaMin,
            Double intendedAreaMax,
            // legacy single-value field
            Double intendedArea,
            String remark
    ) {}

    public record StageReq(ProjectStage stage) {}
    public record TransferReq(@NotBlank String ownerId, String reason) {}

    private Double resolveAreaMin(Double min, Double max, Double legacyArea) {
        if (min != null) {
            return min;
        }
        return legacyArea;
    }

    private Double resolveAreaMax(Double min, Double max, Double legacyArea) {
        if (max != null) {
            return max;
        }
        return legacyArea;
    }
}
