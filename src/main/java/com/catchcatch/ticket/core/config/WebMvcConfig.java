package com.catchcatch.ticket.core.config;

import com.catchcatch.ticket.core.interceptor.AdminInterceptor;
import com.catchcatch.ticket.core.interceptor.LoginInterceptor;
import com.catchcatch.ticket.core.interceptor.SessionInterceptor;
import com.samskivert.mustache.Mustache;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.mustache.MustacheResourceTemplateLoader;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired // DI 처리
    private LoginInterceptor loginInterceptor;
    @Autowired // DI 처리
    private SessionInterceptor sessionInterceptor;
    @Autowired
    private AdminInterceptor adminInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        registry.addInterceptor(sessionInterceptor)
                .addPathPatterns("/**");

        registry.addInterceptor(loginInterceptor)
                .addPathPatterns(
                        /* 인증 처리 인터셉트 필요한 url*/
                        "/users/**",
                        "/api/concerts/**",
                        "/customercenter/**"
                )
                .excludePathPatterns(
                        "/customercenter/faqs",
                        "/customercenter/"
                );

        registry.addInterceptor(adminInterceptor)
                .addPathPatterns(
                        "/admin",
                        "/admin/**"
                );
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public Mustache.Compiler mustacheCompiler(Mustache.TemplateLoader templateLoader) {
        return Mustache.compiler()
                .defaultValue("")
                .withLoader(templateLoader);
    }
}
