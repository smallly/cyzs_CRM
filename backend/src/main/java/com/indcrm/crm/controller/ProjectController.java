package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.ProjectDealType;
import com.indcrm.crm.domain.ProjectStage;
import com.indcrm.crm.service.ProjectService;
import com.indcrm.crm.service.SessionService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

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
                req.intendedPrice(),
                parseLocalDateTime(req.firstContactAt()),
                parseLocalDate(req.firstVisitDate()),
                parseLocalDate(req.firstNegotiationDate()),
                parseLocalDate(req.movedInDate()),
                req.remark()
        ));
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return ApiResponse.ok(PageUtils.maybePaginate(projectService.list(sessionService.requireUser()), page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> detail(@PathVariable("id") String id) {
        return ApiResponse.ok(projectService.getDetail(sessionService.requireUser(), id));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable("id") String id, @RequestBody UpdateReq req) {
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
                req.intendedPrice(),
                req.remark()
        ));
    }

    @PutMapping("/{id}/stage")
    public ApiResponse<?> stage(@PathVariable("id") String id, @RequestBody StageReq req) {
        return ApiResponse.ok(
                projectService.updateStage(
                        sessionService.requireUser(),
                        id,
                        req.stage(),
                        parseLocalDateTime(req.firstContactAt()),
                        parseLocalDate(req.firstVisitDate()),
                        parseLocalDate(req.firstNegotiationDate()),
                        parseLocalDate(req.movedInDate()),
                        req.remark()
                )
        );
    }

    @PutMapping("/{id}/owner")
    public ApiResponse<Void> transfer(@PathVariable("id") String id, @RequestBody TransferReq req) {
        projectService.transferOwner(sessionService.requireUser(), id, req.ownerId(), req.reason());
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") String id) {
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
            String intendedPrice,
            String firstContactAt,
            String firstVisitDate,
            String firstNegotiationDate,
            String movedInDate,
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
            String intendedPrice,
            String remark
    ) {}

    public record StageReq(
            ProjectStage stage,
            String firstContactAt,
            String firstVisitDate,
            String firstNegotiationDate,
            String movedInDate,
            String remark
    ) {}
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

    private LocalDateTime parseLocalDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String raw = value.trim().replace(' ', 'T');
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ex) {
            try {
                return LocalDate.parse(raw).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }
}
