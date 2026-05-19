# API Conventions

褰撳墠椤圭洰鎺ュ彛瑙勮寖鏂囨。銆傞€傜敤浜?V1 鐜拌瀹炵幇鍜屾湰杞‘璁ゅ悗鐨勬垚鍛樺煙鎵╁睍璁捐銆?
---

## 涓€銆佺粺涓€鍝嶅簲缁撴瀯

鍚庣缁熶竴鍝嶅簲缁撴瀯涓?`ApiResponse<T>`锛?
```java
public record ApiResponse<T>(int code, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "ok", data);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
```

鍝嶅簲绀轰緥锛?
```json
{ "code": 0, "message": "ok", "data": { } }
```

```json
{ "code": 422, "message": "phone already bound", "data": null }
```

璇存槑锛?
1. 褰撳墠鍒楄〃鎺ュ彛榛樿杩斿洖鏁扮粍鍒?`data`锛屾湭缁熶竴鍖呰９鍒嗛〉瀵硅薄銆?2. 閴存潈澶辫触鍦烘櫙鍙兘鐩存帴杩斿洖 HTTP 401 涓庣函鏂囨湰 `Unauthorized`銆?
---

## 浜屻€佷笟鍔＄姸鎬佺爜

| 鍚堝悓 | GET | `/api/contracts` | 鍒楄〃锛堟敮鎸佸垎椤碉級 |
| 鍚堝悓 | GET | `/api/contracts/{id}` | 璇︽儏 |
| 鍚堝悓 | POST | `/api/contracts` | 鏂板缓锛堟墜鍔ㄨ緭鍏ュ悎鍚岀紪鍙凤紝缁勭粐鍐呭敮涓€锛?|
| 鍚堝悓 | PUT | `/api/contracts/{id}` | 缂栬緫 |
| 鍚堝悓 | PUT | `/api/contracts/{id}/sign-date` | 淇敼绛剧害鏃ユ湡 |
| 鍚堝悓 | DELETE | `/api/contracts/{id}` | 鍒犻櫎锛堣蒋鍒犻櫎锛?

### 4.6 鍥炴

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 鍥炴 | GET | `/api/payments` | 鍒楄〃锛堟敮鎸佸垎椤碉級 |
| Payment | GET | `/api/payments/{id}` | Detail |
| Payment | PUT | `/api/payments/{id}` | Update |
| Payment | DELETE | `/api/payments/{id}` | Delete |
| 鍥炴 | POST | `/api/payments` | 鏂板缓锛堝繀椤诲叧鑱斿悎鍚岋級 |
| 鍥炴 | PUT | `/api/payments/{id}/paid-date` | 淇敼瀹為檯鍥炴鏃ユ湡 |

### 4.7 鐢ㄦ埛鏈汉锛坄/api/me`锛?
| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 鏈汉 | PUT | `/api/me/profile` | 淇敼骞冲彴绾у鍚?|
| 鏈汉 | PUT | `/api/me/phone` | 淇敼涓绘墜鏈哄彿锛堥渶鍏ㄥ眬鍞竴锛?|
| 鏈汉 | PUT | `/api/me/password` | 淇敼瀵嗙爜锛堥渶鏃у瘑鐮佹牎楠岋紝BCrypt锛?|

### 4.8 绉熸埛鎴愬憳锛坄/api/tenant-users`锛屾帹鑽愭柊鎺ュ彛锛?
| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 绉熸埛鎴愬憳 | GET | `/api/tenant-users` | 鍒楄〃锛堟敮鎸佸垎椤碉級 |
| 绉熸埛鎴愬憳 | POST | `/api/tenant-users` | 鏂板鎴愬憳 |
| 绉熸埛鎴愬憳 | PUT | `/api/tenant-users/{id}` | 缂栬緫鎴愬憳锛坄name`銆乣employee_no`銆乣status`锛?|
| 绉熸埛鎴愬憳 | PUT | `/api/tenant-users/{id}/pending-phone` | 淇敼鏈縺娲绘垚鍛樺緟缁戝畾鎵嬫満鍙?|
| 绉熸埛鎴愬憳 | PUT | `/api/tenant-users/{id}/status` | 鏇存柊鎴愬憳鐘舵€?|

### 4.9 閮ㄩ棬褰掑睘锛坄/api/memberships`锛?
| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 閮ㄩ棬褰掑睘 | GET | `/api/tenant-users/{id}/memberships` | 鏌ヨ鏌愭垚鍛橀儴闂ㄥ綊灞炲垪琛?|
| 閮ㄩ棬褰掑睘 | POST | `/api/tenant-users/{id}/memberships` | 鏂板閮ㄩ棬褰掑睘 |
| 閮ㄩ棬褰掑睘 | PUT | `/api/memberships/{membershipId}` | 缂栬緫閮ㄩ棬褰掑睘 |
| 閮ㄩ棬褰掑睘 | PUT | `/api/memberships/{membershipId}/status` | 澶辨晥閮ㄩ棬褰掑睘锛堥€昏緫澶辨晥锛岃褰?`left_at`锛?|

### 4.10 閮ㄩ棬

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 閮ㄩ棬 | GET | `/api/departments` | 鍒楄〃 |
| 閮ㄩ棬 | POST | `/api/departments` | 鏂板缓 |
| 閮ㄩ棬 | PUT | `/api/departments/{id}` | 缂栬緫 |
| 閮ㄩ棬 | PUT | `/api/departments/{id}/status` | 鏇存柊鐘舵€侊紙鍚敤/鍋滅敤锛?|

### 4.11 瑙掕壊

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 瑙掕壊 | GET | `/api/roles` | 榛樿瑙掕壊鍒楄〃 |

### 4.12 绯荤粺閰嶇疆

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 瑙掕壊 | PUT | `/api/roles/{code}/scope` | 鏇存柊瑙掕壊鏁版嵁鑼冨洿 |
| 绯荤粺閰嶇疆 | GET | `/api/system/scope-mode` | 鍏煎鏃ф帴鍙ｏ細鏌ヨ閿€鍞憳鏁版嵁鑼冨洿 |
| 绯荤粺閰嶇疆 | PUT | `/api/system/scope-mode` | 鍏煎鏃ф帴鍙ｏ細鏇存柊閿€鍞憳鏁版嵁鑼冨洿 |
| 绯荤粺閰嶇疆 | GET | `/api/system/dicts` | 鏌ヨ鏁版嵁瀛楀吀 |
| 绯荤粺閰嶇疆 | PUT | `/api/system/dicts` | 鏇存柊鏁版嵁瀛楀吀 |

### 4.13 瀹¤鏃ュ織

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 瀹¤ | GET | `/api/audit-logs` | 瀹¤鏃ュ織鍒楄〃 |

### 4.14 SSE

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| SSE | GET | `/api/stream/subscribe` | 浜嬩欢娴佽闃?|

### 4.15 鍘傚晢绉熸埛绠＄悊锛圫aaS 骞冲彴绾э級

| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 鍘傚晢 | GET | `/api/vendor/tenants` | 绉熸埛鍒楄〃锛堟敮鎸佸垎椤碉級 |
| 鍘傚晢 | GET | `/api/vendor/tenants/admin-phone-exists` | 妫€鏌ョ鐞嗗憳鎵嬫満鍙锋槸鍚﹀瓨鍦?|
| 鍘傚晢 | POST | `/api/vendor/tenants` | 寮€閫氭柊绉熸埛 |
| 鍘傚晢 | PUT | `/api/vendor/tenants/{tenantId}/status` | 鏇存柊绉熸埛鐘舵€?|
| 鍘傚晢 | PUT | `/api/vendor/tenants/{tenantId}/renew` | 绉熸埛缁湡 |

### 4.16 鏃х増鎴愬憳鎺ュ彛锛坄/api/users`锛岄€愭杩佺Щ鑷?`/api/tenant-users`锛?
| 妯″潡 | 鏂规硶 | 璺緞 | 璇存槑 |
|---|---|---|---|
| 鎴愬憳 | GET | `/api/users` | 鎴愬憳鍒楄〃 |
| 鎴愬憳 | POST | `/api/users` | 鍒涘缓鎴愬憳锛堝惈瀵嗙爜锛?|
| 鎴愬憳 | PUT | `/api/users/{id}` | 缂栬緫鎴愬憳鍩虹淇℃伅 |
| 鎴愬憳 | PUT | `/api/users/{id}/status` | 鏇存柊鎴愬憳鐘舵€?|
| 鎴愬憳 | PUT | `/api/users/{id}/role` | 鏇存柊瑙掕壊 |
| 鎴愬憳 | PUT | `/api/users/{id}/department` | 鏇存柊閮ㄩ棬 |

---

## 浜斻€佹垚鍛樺煙鎺ュ彛璇︾粏绾﹀畾

鎴愬憳鍩熸帴鍙ｅ凡鍏ㄩ儴钀藉湴銆備互涓嬩负涓昏鎺ュ彛鐨勮姹?鍝嶅簲绾﹀畾銆?
### 5.1 绉熸埛鎴愬憳

| 鍔熻兘 | 鏂规硶 | 璺緞 |
|---|---|---|
| 鍒楄〃 | GET | `/api/tenant-users?page=&size=` |
| 鏂板鎴愬憳 | POST | `/api/tenant-users` |
| 缂栬緫鎴愬憳 | PUT | `/api/tenant-users/{id}` |
| 淇敼鏈縺娲绘垚鍛樺緟缁戝畾鎵嬫満鍙?| PUT | `/api/tenant-users/{id}/pending-phone` |
| 鏇存柊鎴愬憳鐘舵€?| PUT | `/api/tenant-users/{id}/status` |

璇锋眰瀛楁绾﹀畾锛?
1. `tenant_users.name`锛氱鎴峰唴鏄剧ず濮撳悕
2. `employee_no`锛氱鎴峰唴鍞竴锛屽彲涓虹┖
3. `pending_phone`锛氫粎鏈縺娲绘垚鍛樹娇鐢?4. `status`锛歚pending` / `active` / `disabled` / `left`

瑙勫垯锛?
1. 宸叉縺娲绘垚鍛樼姝㈤€氳繃绉熸埛鎴愬憳鎺ュ彛淇敼姝ｅ紡鎵嬫満鍙?2. 鏈縺娲绘垚鍛樹慨鏀规墜鏈哄彿鏃讹紝浠呮洿鏂?`pending_phone`
3. 鎴愬憳棣栨鐧诲綍杩涘叆绉熸埛鍚庯紝鏈嶅姟灞傝礋璐ｅ畬鎴?`user_id` 缁戝畾涓庢縺娲?
### 5.2 鐢ㄦ埛鏈汉

| 鍔熻兘 | 鏂规硶 | 璺緞 |
|---|---|---|
| 淇敼骞冲彴绾у鍚?| PUT | `/api/me/profile` |
| 淇敼涓绘墜鏈哄彿 | PUT | `/api/me/phone` |
| 淇敼瀵嗙爜 | PUT | `/api/me/password` |

`PUT /api/me/password` 璇锋眰绀轰緥锛?
```json
{
  "oldPassword": "current123",
  "newPassword": "newPass456"
}
```

瑙勫垯锛?
1. 瀵嗙爜浣跨敤 BCrypt 鍔犲瘑瀛樺偍
2. 淇敼瀵嗙爜蹇呴』鎻愪緵姝ｇ‘鐨勬棫瀵嗙爜
3. 鏂版墜鏈哄彿蹇呴』鍏ㄥ眬鍞竴
4. 鏇存柊 `users.phone` 鏃跺悓姝ユ洿鏂版墜鏈哄彿绫昏璇佽褰?
### 5.3 閮ㄩ棬褰掑睘

| 鍔熻兘 | 鏂规硶 | 璺緞 |
|---|---|---|
| 鏌ヨ閮ㄩ棬褰掑睘 | GET | `/api/tenant-users/{id}/memberships` |
| 鏂板閮ㄩ棬褰掑睘 | POST | `/api/tenant-users/{id}/memberships` |
| 缂栬緫閮ㄩ棬褰掑睘 | PUT | `/api/memberships/{membershipId}` |
| 澶辨晥閮ㄩ棬褰掑睘 | PUT | `/api/memberships/{membershipId}/status` |

璇锋眰瀛楁绾﹀畾锛?
1. `department_id`锛氬綋鍓嶉儴闂ㄦ爲涓嬬殑閮ㄩ棬鏍囪瘑
2. `position`锛氳嚜鐢辨枃鏈?3. `role_id`锛氬崟鍊?4. `is_primary`锛氬悓涓€鎴愬憳浠呭厑璁镐竴鏉℃湁鏁堣褰曚负 `true`
5. `status`锛歚active` / `inactive`
6. `left_at`锛氬け鏁堟椂璁板綍绂诲紑鏃堕棿锛圛SO 鏍煎紡锛?
瑙勫垯锛?
1. 涓€涓垚鍛樺彲鏈夊鏉￠儴闂ㄥ綊灞?2. 鍒犻櫎閮ㄩ棬褰掑睘鏃朵笉鐗╃悊鍒犻櫎锛屾敼 `status` 骞惰褰?`left_at`

---

## 鍏€佸垪琛ㄦ煡璇笌鍒嗛〉

褰撳墠瀹炵幇浠モ€滃叏閲忓垪琛?+ 鍓嶇杩囨护鈥濅负涓汇€?
鐜拌鏌ヨ绀轰緥锛?
```http
GET /api/followups
GET /api/followups/{id}
GET /api/followups?projectId=90d737bb-857d-4a96-bf66-a4da74d3aa9f
```

鍚庣画鑻ユ垚鍛樺垪琛ㄦ垨閮ㄩ棬褰掑睘鍒楄〃鏁版嵁閲忔墿澶э紝鍐嶇粺涓€寮曞叆锛?
1. `pageNo`
2. `pageSize`
3. 鎺掑簭鍙傛暟

---

## 涓冦€佹椂闂存牸寮忕害瀹?
鏃ユ湡瀛楁缁熶竴浣跨敤锛?
```text
yyyy-MM-dd
```

鏃ユ湡鏃堕棿瀛楁缁熶竴浣跨敤锛?
```text
yyyy-MM-ddTHH:mm:ss
```

鎴愬憳鍩熼噸鐐瑰瓧娈碉細

1. `first_login_at`
2. `last_login_at`
3. `joined_at`
4. `left_at`
5. `verified_at`

---

## 鍏€佸瓧娈靛懡鍚嶈鑼?
| 棰嗗煙 | 瀛楁 |
|---|---|
| 鐢ㄦ埛涓讳綋 | `user_id`, `phone`, `name`, `last_tenant_id` |
| 璁よ瘉鏂瑰紡 | `auth_type`, `auth_identifier`, `password_hash`, `verified_at` |
| 绉熸埛鎴愬憳 | `tenant_id`, `pending_phone`, `employee_no`, `activated`, `first_login_at`, `last_login_at` |
| 閮ㄩ棬褰掑睘 | `department_id`, `position`, `role_id`, `is_primary`, `left_at` |

璇存槑锛?
1. `users.phone` 鏄寮忎富鎵嬫満鍙?2. `users.last_tenant_id` 鏄渶杩戞垚鍔熻繘鍏ョ殑绉熸埛
3. `tenant_users.pending_phone` 鏄緟缁戝畾鎵嬫満鍙?4. 涓よ€呬笉鑳芥贩鐢?
---

## 涔濄€侀壌鏉冧笌鏉冮檺绾﹀畾

閴存潈锛?
1. `/api/auth/login` 鍏嶉壌鏉?2. 鍏朵綑 `/api/*` 榛樿闇€瑕?token
3. token 閫氳繃 `Authorization: Bearer <token>` 浼犻€?
鎴愬憳鍩熸潈闄愶細

1. 鐢ㄦ埛鏈汉鍙皟鐢?`/api/me/*`
2. 绉熸埛绠＄悊鍛樺彲璋冪敤 `/api/tenant-users/*` 涓庨儴闂ㄥ綊灞炵淮鎶ゆ帴鍙?3. 绉熸埛绠＄悊鍛樹笉鍙慨鏀瑰凡婵€娲绘垚鍛樻寮忔墜鏈哄彿鍜屽瘑鐮?
---

## 鍗併€侀敊璇鐞嗗師鍒?
1. 涓氬姟鏍￠獙澶辫触鎶?`BizException(code, message)`
2. 缁熶竴鐢?`GlobalExceptionHandler` 杞崲涓?`ApiResponse.fail`
3. 鍓嶇缁熶竴鐢辫姹傚皝瑁呭鐞?`code !== 0`
4. 鍒犻櫎鎴栧け鏁堢被鎿嶄綔蹇呴』鍏堜簩娆＄‘璁?
鎴愬憳鍩熸帹鑽愰敊璇彁绀猴細

1. `phone already bound`
2. `activated member phone is immutable`
3. `employee_no already exists in tenant`
4. `only one primary membership is allowed`

---

## 鍗佷竴銆丼SE 绾﹀畾

璁㈤槄鎺ュ彛锛?
```http
GET /api/stream/subscribe
```

閴存潈鏂瑰紡锛?
1. 浼樺厛 `Authorization: Bearer <token>`
2. 鍏煎 query 鍙傛暟 `?token=...`
