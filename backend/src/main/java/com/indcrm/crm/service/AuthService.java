package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final InMemoryStore store;

    public AuthService(InMemoryStore store) {
        this.store = store;
    }

    public User login(String phone, String password) {
        for (User user : store.users.values()) {
            if (user.phone.equals(phone) && user.password.equals(password)) {
                if (user.status != UserStatus.ENABLED) {
                    throw new BizException(ErrorCode.AUTH_403, "账号已停用");
                }
                return user;
            }
        }
        throw new BizException(ErrorCode.AUTH_401, "账号或密码错误");
    }
}
