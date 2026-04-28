package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
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
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "enterpriseName", required = false) String enterpriseName,
            @RequestParam(value = "phone1", required = false) String phone1,
            @RequestParam(value = "phone2", required = false) String phone2
    ) {
        return ApiResponse.ok(
                PageUtils.maybePaginate(
                        contactService.list(sessionService.requireUser(), name, enterpriseName, phone1, phone2),
                        page,
                        size
                )
        );
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable("id") String id, @Valid @RequestBody ContactReq req) {
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
    public ApiResponse<Void> delete(@PathVariable("id") String id) {
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
            List<String> projectIds
    ) {}
}
