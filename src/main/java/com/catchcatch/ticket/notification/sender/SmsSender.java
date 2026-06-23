package com.catchcatch.ticket.notification.sender;

import com.solapi.sdk.SolapiClient;
import com.solapi.sdk.message.model.Message;
import com.solapi.sdk.message.service.DefaultMessageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SmsSender implements MessageSender<MessagePayload> {

    @Value("${sol.key}")
    private String solKey;

    @Value("${sol.secret}")
    private String solSecret;

    @Value("${sol.sender}")
    private String solSender;

    private DefaultMessageService messageService;

    @PostConstruct // DI 전에 실행
    public void init() {
        this.messageService = SolapiClient.INSTANCE.createInstance(solKey, solSecret);
    }

    @Override
    public void send(MessagePayload message) {
        Message sms = new Message();
        sms.setFrom(solSender);
        sms.setTo(message.getTo());
        sms.setText(message.getContent());

        try{
            messageService.send(sms);
        } catch(Exception e){
            throw new RuntimeException(e);
        }

    }
}
