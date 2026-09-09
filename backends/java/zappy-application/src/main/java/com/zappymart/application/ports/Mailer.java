package com.zappymart.application.ports;

public interface Mailer {

    void send(MailMessage message);

    record MailMessage(String recipient, String subject, String body) {
    }
}
