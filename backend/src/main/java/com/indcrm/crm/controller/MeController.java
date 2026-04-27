package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.service.ProfileService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final SessionService sessionService;
    private final ProfileService profileService;

    public MeController(SessionService sessionService, ProfileService profileService) {
        this.sessionService = sessionService;
        this.profileService = profileService;
    }

    @PutMapping("/profile")
    public ApiResponse<?> updateProfile(@RequestBody ProfileReq req) {
        return ApiResponse.ok(profileService.updateProfile(sessionService.requireUser(), req.name()));
    }

    @PutMapping("/phone")
    public ApiResponse<?> updatePhone(@RequestBody PhoneReq req) {
        return ApiResponse.ok(profileService.updatePhone(sessionService.requireUser(), req.newPhone()));
    }

    @PutMapping("/password")
    public ApiResponse<?> changePassword(@RequestBody PasswordReq req) {
        return ApiResponse.ok(profileService.changePassword(sessionService.requireUser(), req.oldPassword(), req.newPassword()));
    }

    public record ProfileReq(String name) {}

    public record PhoneReq(String newPhone) {}

    public record PasswordReq(String oldPassword, String newPassword) {}
}
