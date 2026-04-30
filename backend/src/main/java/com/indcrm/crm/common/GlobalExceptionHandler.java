package com.indcrm.crm.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public ApiResponse<Void> handleBiz(BizException ex) {
        return ApiResponse.fail(ex.getCode(), translateMessage(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> translateValidationMessage(error.getField(), error.getDefaultMessage()))
                .orElse("参数校验失败");
        return ApiResponse.fail(ErrorCode.BIZ_422, message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ApiResponse<Void> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .findFirst()
                .map(violation -> translateValidationMessage(violation.getPropertyPath().toString(), violation.getMessage()))
                .orElse("参数校验失败");
        return ApiResponse.fail(ErrorCode.BIZ_422, message);
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleAny(Exception ex) {
        return ApiResponse.fail(500, translateMessage(ex.getMessage()));
    }

    private String translateValidationMessage(String field, String message) {
        if (message == null || message.isBlank()) {
            return "参数校验失败";
        }
        String fieldName = translateFieldName(field);
        if ("must not be blank".equals(message) || "不能为空".equals(message)) {
            return fieldName + "不能为空";
        }
        if ("must not be null".equals(message)) {
            return fieldName + "不能为空";
        }
        return translateMessage(message);
    }

    private String translateFieldName(String field) {
        if (field == null || field.isBlank()) {
            return "参数";
        }
        String normalized = field;
        int dot = normalized.lastIndexOf('.');
        if (dot >= 0 && dot < normalized.length() - 1) {
            normalized = normalized.substring(dot + 1);
        }
        return switch (normalized) {
            case "name" -> "姓名";
            case "phone", "phone1" -> "手机号1";
            case "phone2" -> "手机号2";
            case "password" -> "密码";
            case "tenantName" -> "组织名称";
            case "contactId" -> "联系人";
            case "ownerId" -> "负责人";
            case "projectId" -> "项目";
            case "contractId" -> "合同";
            case "contractNo" -> "合同编号";
            case "amount" -> "金额";
            case "signDate" -> "签约日期";
            case "paidDate" -> "回款日期";
            case "content" -> "内容";
            default -> "参数";
        };
    }

    private String translateMessage(String message) {
        if (message == null || message.isBlank()) {
            return "操作失败";
        }
        if (message.startsWith("Linked contact does not exist")) {
            return "关联联系人不存在";
        }
        if (message.startsWith("Linked project does not exist")) {
            return "关联项目不存在";
        }
        return switch (message) {
            case "No permission" -> "无权操作";
            case "vendor admin only" -> "仅平台管理员可操作";
            case "account is disabled" -> "账号已禁用";
            case "tenant is disabled" -> "组织已停用";
            case "tenant is expired" -> "组织已过期";
            case "invalid phone or password" -> "手机号或密码错误";
            case "tenantId is required" -> "组织不能为空";
            case "no access to tenant" -> "无权访问该组织";
            case "phone already exists in tenant" -> "手机号已存在";
            case "phone already exists" -> "手机号已存在";
            case "pending phone already exists in tenant" -> "待确认手机号已存在";
            case "phone already bound" -> "手机号已绑定";
            case "phone1 cannot equal phone2" -> "手机号1不能与手机号2相同";
            case "name is required" -> "姓名不能为空";
            case "phone is required" -> "手机号不能为空";
            case "new phone is required" -> "新手机号不能为空";
            case "password is required" -> "密码不能为空";
            case "old password is required" -> "旧密码不能为空";
            case "new password is required" -> "新密码不能为空";
            case "new password must be at least 6 characters", "password at least 6 characters" -> "新密码长度不能少于6位";
            case "new password must be different from old password" -> "新密码不能与旧密码相同";
            case "incorrect old password" -> "旧密码错误";
            case "role is required" -> "角色不能为空";
            case "status is required" -> "状态不能为空";
            case "user not found" -> "用户不存在";
            case "admin not found" -> "管理员不存在";
            case "Contact not found" -> "联系人不存在";
            case "Contact is linked by project and cannot be deleted" -> "联系人已关联项目，不能删除";
            case "Linked project does not exist" -> "关联项目不存在";
            case "No permission to view contact" -> "无权查看该联系人";
            case "No permission to edit contact" -> "无权编辑该联系人";
            case "No permission to delete contact" -> "无权删除该联系人";
            case "No permission to link project" -> "无权关联该项目";
            case "Parent department is required" -> "上级部门不能为空";
            case "Parent department is disabled" -> "上级部门已禁用";
            case "Department parent cannot be itself" -> "上级部门不能是当前部门";
            case "Department parent cannot be its child" -> "上级部门不能是当前部门的下级部门";
            case "Department status is required" -> "部门状态不能为空";
            case "Department name is required" -> "部门名称不能为空";
            case "Department name length must be <= 64" -> "部门名称长度不能超过64个字符";
            case "Department head not found" -> "部门负责人不存在";
            case "Department not found" -> "部门不存在";
            case "department is required" -> "部门不能为空";
            case "department not found" -> "部门不存在";
            case "department is disabled" -> "部门已禁用";
            case "Project does not exist" -> "项目不存在";
            case "No permission to create followup" -> "无权新建跟进记录";
            case "No permission to view followups" -> "无权查看跟进记录";
            case "No permission to edit followup" -> "无权编辑跟进记录";
            case "No permission to delete followup" -> "无权删除跟进记录";
            case "content is required" -> "内容不能为空";
            case "followupAt is required" -> "跟进时间不能为空";
            case "Linked contact does not belong to project" -> "关联联系人不属于该项目";
            case "Followup does not exist" -> "跟进记录不存在";
            case "only one primary membership is allowed" -> "只能设置一个主成员身份";
            case "no member management permission" -> "无成员管理权限";
            case "tenant user not found" -> "成员不存在";
            case "membership not found" -> "成员身份不存在";
            case "activated member phone is immutable" -> "已激活成员的手机号不能修改";
            case "pending phone is required" -> "待确认手机号不能为空";
            case "employee_no already exists in tenant" -> "员工编号已存在";
            case "contactId is required" -> "联系人不能为空";
            case "ownerId is required" -> "负责人不能为空";
            case "Owner does not exist" -> "负责人不存在";
            case "No permission to view project" -> "无权查看该项目";
            case "No permission to edit project" -> "无权编辑该项目";
            case "No permission to update stage" -> "无权更新阶段";
            case "stage is required" -> "阶段不能为空";
            case "Stage cannot move backward" -> "阶段不能回退";
            case "Skipping stages requires remark" -> "跨阶段更新必须填写备注";
            case "firstContactAt is required for PROSPECTING" -> "约客阶段必须填写首次建联时间";
            case "firstVisitDate is required for VISITING stage and above" -> "带看及后续阶段必须填写首次带看日期";
            case "firstNegotiationDate is required for NEGOTIATING stage and above" -> "谈判及后续阶段必须填写首次谈判日期";
            case "movedInDate is required for MOVED_IN" -> "入驻阶段必须填写入驻日期";
            case "No permission to transfer owner" -> "无权转移负责人";
            case "newOwnerId is required" -> "新负责人不能为空";
            case "New owner does not exist" -> "新负责人不存在";
            case "No permission to delete project" -> "无权删除该项目";
            case "level is not in configured dictionary" -> "项目级别不在数据字典中";
            case "source is not in configured dictionary" -> "项目来源不在数据字典中";
            case "intendedAreaMin must be >= 0" -> "意向面积最小值不能小于0";
            case "intendedAreaMax must be >= 0" -> "意向面积最大值不能小于0";
            case "intended area range is invalid" -> "意向面积区间不合法";
            case "tenant already exists" -> "组织已存在";
            default -> message;
        };
    }
}
