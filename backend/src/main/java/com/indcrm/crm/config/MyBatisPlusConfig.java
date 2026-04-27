package com.indcrm.crm.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.indcrm.crm.mapper")
public class MyBatisPlusConfig {
}
