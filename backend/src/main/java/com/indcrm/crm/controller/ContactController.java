package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.service.ContactService;
import com.indcrm.crm.service.SessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
@Validated
public class ContactController {
    private final SessionService sessionService;
    private final ContactService contactService;

    public ContactController(SessionService sessionService, ContactService contactService) {
        this.sessionService = sessionService;
        this.contactService = contactService;
    }

    @PostMapping
    public ApiResponse<?> create(@Valid @RequestBody ContactReq req) {
        return ApiResponse.ok(
                contactService.create(
                        sessionService.requireUser(),
                        req.name(),
                        req.enterpriseName(),
                        req.title(),
                        req.phone1(),
                        req.phone2(),
                        req.wechat(),
                        req.email(),
                        req.officePhone(),
                        req.gender(),
                        req.decisionMaker(),
                        req.remark(),
                        req.projectIds()
                )
        );
    }

    @GetMapping
    public ApiResponse<?> list() {
        return ApiResponse.ok(contactService.list(sessionService.requireUser()));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable String id, @Valid @RequestBody ContactReq req) {
        return ApiResponse.ok(
                contactService.update(
                        sessionService.requireUser(),
                        id,
                        req.name(),
                        req.enterpriseName(),
                        req.title(),
                        req.phone1(),
                        req.phone2(),
                        req.wechat(),
                        req.email(),
                        req.officePhone(),
                        req.gender(),
                        req.decisionMaker(),
                        req.remark(),
                        req.projectIds()
                )
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        contactService.delete(sessionService.requireUser(), id);
        return ApiResponse.ok(null);
    }

    public record ContactReq(
            @NotBlank String name,
            String enterpriseName,
            String title,
            @NotBlank String phone1,
            String phone2,
            String wechat,
            String email,
            String officePhone,
            String gender,
            Boolean decisionMaker,
            String remark,
            @NotEmpty List<String> projectIds
    ) {}
}
