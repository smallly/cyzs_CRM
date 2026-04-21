package com.indcrm.crm.auth;

import com.indcrm.crm.domain.User;

public class AuthContext {
    private static final ThreadLocal<User> USER_HOLDER = new ThreadLocal<>();

    public static void set(User user) { USER_HOLDER.set(user); }
    public static User get() { return USER_HOLDER.get(); }
    public static void clear() { USER_HOLDER.remove(); }
}
