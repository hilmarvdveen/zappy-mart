package com.zappymart.adapters.mail;

import com.zappymart.application.ports.Mailer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class ConsoleMailer implements Mailer {

    private static final Logger LOGGER = LoggerFactory.getLogger(ConsoleMailer.class);

    @Override
    public void send(MailMessage message) {
        LOGGER.info("Mail to {} with subject {}{}{}", message.recipient(), message.subject(),
                System.lineSeparator(), message.body());
    }
}
