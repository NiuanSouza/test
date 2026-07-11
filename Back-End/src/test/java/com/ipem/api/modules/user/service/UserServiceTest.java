package com.ipem.api.modules.user.service;

import com.ipem.api.modules.user.dto.RegisterDTO;
import com.ipem.api.modules.user.model.User;
import com.ipem.api.modules.user.model.enums.Permission;
import com.ipem.api.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private RegisterDTO registerDTO;

    @BeforeEach
    void setUp() {
        registerDTO = new RegisterDTO("12345", "João", "joao@ipem.com", "senha123", Permission.TECHNICIAN);
    }

    @Test
    void shouldRegisterUserSuccessfully() {
        when(userRepository.existsById(registerDTO.registration())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_senha123");

        User savedUser = User.builder()
                .registration(registerDTO.registration())
                .name(registerDTO.name())
                .email(registerDTO.email())
                .password("hashed_senha123")
                .permission(registerDTO.permission())
                .build();
        savedUser.setIsActive(true);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        User result = userService.registerUser(registerDTO);

        assertNotNull(result);
        assertTrue(result.getIsActive());
        assertEquals("joao@ipem.com", result.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void shouldThrowExceptionWhenRegistrationAlreadyExists() {
        when(userRepository.existsById(registerDTO.registration())).thenReturn(true);

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            userService.registerUser(registerDTO);
        });

        assertEquals("Registration already exists!", exception.getMessage());
        verify(userRepository, never()).save(any());
    }
}
