package com.zappymart.application.ordering;

import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.application.ports.DomainEventHandler;
import com.zappymart.application.ports.Mailer;
import com.zappymart.application.ports.OrderRepository;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.ordering.Order;
import com.zappymart.domain.ordering.OrderLine;
import com.zappymart.domain.ordering.OrderPlaced;

import java.util.Optional;
import java.util.StringJoiner;

public final class SendOrderConfirmation implements DomainEventHandler<OrderPlaced> {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final Mailer mailer;

    public SendOrderConfirmation(OrderRepository orderRepository, CustomerRepository customerRepository,
                                 Mailer mailer) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.mailer = mailer;
    }

    @Override
    public Class<OrderPlaced> eventType() {
        return OrderPlaced.class;
    }

    @Override
    public void handle(OrderPlaced event) {
        Optional<Customer> customer = customerRepository.byId(event.customerId());
        Optional<Order> order = orderRepository.byIdOfCustomer(event.orderId(), event.customerId());
        if (customer.isEmpty() || order.isEmpty()) {
            return;
        }
        mailer.send(new Mailer.MailMessage(customer.get().email().value(),
                "Your Zappy Mart order " + order.get().number(),
                bodyFor(customer.get(), order.get())));
    }

    private String bodyFor(Customer customer, Order order) {
        StringJoiner body = new StringJoiner(System.lineSeparator());
        body.add("Hello " + customer.name() + ",");
        body.add("");
        body.add("Thank you for your order " + order.number() + ".");
        body.add("");
        for (OrderLine line : order.lines()) {
            body.add(line.quantity() + " x " + line.productName() + "  " + line.lineTotal().amount() + " cents");
        }
        body.add("");
        body.add("Subtotal  " + order.subtotal().amount() + " cents");
        body.add("Shipping  " + order.shipping().amount() + " cents");
        body.add("Discount  " + order.discount().amount() + " cents");
        body.add("Total     " + order.total().amount() + " cents");
        return body.toString();
    }
}
