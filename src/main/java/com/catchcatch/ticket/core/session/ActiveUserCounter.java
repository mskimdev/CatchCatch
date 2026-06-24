package com.catchcatch.ticket.core.session;

import com.catchcatch.ticket.core.util.Define;
import jakarta.servlet.http.HttpSessionAttributeListener;
import jakarta.servlet.http.HttpSessionBindingEvent;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class ActiveUserCounter implements HttpSessionAttributeListener {

    private final AtomicInteger count = new AtomicInteger(0);

    @Override
    public void attributeAdded(HttpSessionBindingEvent event) {
        if (Define.SESSION_USER.equals(event.getName())) {
            count.incrementAndGet();
        }
    }

    @Override
    public void attributeRemoved(HttpSessionBindingEvent event) {
        if (Define.SESSION_USER.equals(event.getName())) {
            count.decrementAndGet();
        }
    }

    public int getCount() {
        return count.get();
    }
}
