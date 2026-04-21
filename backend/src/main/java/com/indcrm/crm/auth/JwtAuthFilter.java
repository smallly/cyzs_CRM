package com.indcrm.crm.auth;

import com.indcrm.crm.domain.User;
import com.indcrm.crm.repo.InMemoryStore;
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
    private final InMemoryStore store;

    public JwtAuthFilter(JwtService jwtService, InMemoryStore store) {
        this.jwtService = jwtService;
        this.store = store;
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
                User user = store.users.get(uid);
                if (user != null) {
                    AuthContext.set(user);
                }
            }
            filterChain.doFilter(request, response);
        } catch (Exception e) {
            response.setStatus(401);
            response.getWriter().write("Unauthorized");
        } finally {
            AuthContext.clear();
        }
    }
}
