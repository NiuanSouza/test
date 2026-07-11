package com.ipem.api;

import com.ipem.api.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("h2")
public class H2InitTest {
    @Autowired
    private UserRepository userRepository;

    @Test
    void checkUsersCount() {
        long count = userRepository.count();
        System.out.println("USER COUNT IN DB: " + count);
        assertTrue(count > 0, "No users were inserted!");
    }
}
