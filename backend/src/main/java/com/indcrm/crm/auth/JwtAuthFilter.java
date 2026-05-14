package com.indcrm.crm.auth;

import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.VendorAdmin;
import com.indcrm.crm.mapper.UserMapper;
import com.indcrm.crm.mapper.VendorAdminMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final VendorAdminMapper vendorAdminMapper;

    public JwtAuthFilter(JwtService jwtService, UserMapper userMapper, VendorAdminMapper vendorAdminMapper) {
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.vendorAdminMapper = vendorAdminMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/auth/login") || path.startsWith("/actuator");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            String token = null;
            if (header != null && header.startsWith("Bearer ")) {
                token = header.substring(7);
            } else {
                token = request.getParameter("token");
            }
            if (token != null && !token.isBlank()) {
                Claims claims = jwtService.parse(token);
                String uid = claims.get("uid", String.class);
                String tid = claims.get("tid", String.class);
                String type = claims.get("type", String.class);

                if ("VENDOR".equals(type)) {
                    VendorAdmin admin = vendorAdminMapper.selectById(uid);
                    if (admin != null) {
                        User user = convertToUser(admin);
                        if (tid != null && !tid.isBlank()) {
                            user.tenantId = tid;
                        }
                        AuthContext.set(user);
                    }
                } else {
                    User user = userMapper.selectById(uid);
                    if (user != null) {
                        if (tid != null && !tid.isBlank()) {
                            user.tenantId = tid;
                        }
                        AuthContext.set(user);
                    }
                }
            }
        } catch (Exception e) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":401,\"message\":\"请先登录\",\"data\":null}");
            AuthContext.clear();
            return;
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            AuthContext.clear();
        }
    }

    private User convertToUser(VendorAdmin admin) {
        User user = new User();
        user.id = admin.id;
        user.phone = admin.phone;
        user.password = admin.password;
        user.name = admin.name;
        user.status = admin.status;
        user.tenantId = "vendor-default";
        user.vendorAdmin = true;
        user.systemAdmin = true;
        user.bizRole = com.indcrm.crm.domain.BizRole.PROJECT_ADMIN;
        user.createdAt = admin.createdAt;
        return user;
    }
}
