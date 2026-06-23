package com.catchcatch.ticket.notification.sender;

public interface MessageSender<T> {
    void send(T payload);
}
