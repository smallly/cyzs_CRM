package com.indcrm.crm.service;

import com.indcrm.crm.auth.AuthContext;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserStatus;
import org.springframework.stereotype.Service;

@Service
public class SessionService {
    public User requireUser() {
        User user = AuthContext.get();
        if (user == null) {
            throw new BizException(ErrorCode.AUTH_401, "请先登录");
        }
        if (user.status != UserStatus.ENABLED) {
            throw new BizException(ErrorCode.AUTH_403, "账号已停用");
        }
        return user;
    }
}
