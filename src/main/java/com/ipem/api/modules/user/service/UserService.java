package com.ipem.api.modules.user.service;

import com.ipem.api.modules.user.dto.RegisterDTO;
import com.ipem.api.modules.user.model.User;
import com.ipem.api.modules.user.model.enums.EmployeeStatus;
import com.ipem.api.modules.user.model.enums.Permission;
import com.ipem.api.modules.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.mail.javamail.JavaMailSender mailSender;
    private final com.ipem.api.infrastructure.security.TokenService tokenService;

    public UserService(UserRepository repository, PasswordEncoder passwordEncoder, org.springframework.mail.javamail.JavaMailSender mailSender, com.ipem.api.infrastructure.security.TokenService tokenService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.tokenService = tokenService;
    }

    @Transactional
    public User registerUser(RegisterDTO data) {
        if (repository.existsById(data.registration())) {
            throw new RuntimeException("Registration already exists!");
        }

        User newUser = User.builder()
                .registration(data.registration())
                .name(data.name())
                .email(data.email())
                .password(passwordEncoder.encode(data.password()))
                .permission(data.permission())
                .build();

        newUser.setIsActive(true);

        return repository.save(newUser);
    }

    public List<User> findAllUsers() {
        return repository.findAll();
    }

    public List<User> findAllByPermission(Permission permission) {
        return repository.findByPermissionAndIsActiveTrue(permission);
    }

    // SOMENTE TÉCNICOS COM STATUS ACTIVE
    public List<User> findActiveTechnicians() {
        return repository.findByPermissionAndEmployeeStatusAndIsActiveTrue(
                Permission.TECHNICIAN,
                EmployeeStatus.AVAILABLE
        );
    }

    @Transactional
    public void deleteUser(String registration) {
        User user = repository.findByRegistrationAndIsActiveTrue(registration)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setIsActive(false);
        repository.save(user);
    }

    public User findByRegistration(String registration) {
        return repository.findByRegistrationAndIsActiveTrue(registration)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUserFields(String registration, Map<String, Object> updates) {

        User user = repository.findByRegistrationAndIsActiveTrue(registration)
                .orElseThrow(() -> new RuntimeException(
                        "Usuário não encontrado com a matrícula: " + registration
                ));

        updates.forEach((key, value) -> {
            if (value == null) return;

            switch (key) {
                case "name":
                    user.setName((String) value);
                    break;
                case "email":
                    user.setEmail((String) value);
                    break;
                case "phone":
                    user.setPhone((String) value);
                    break;
                case "gender":
                    user.setGender((String) value);
                    break;
                case "employeeStatus":
                    user.setEmployeeStatus(EmployeeStatus.valueOf(value.toString().toUpperCase()));
                    break;
                case "permission":
                    user.setPermission(Permission.valueOf(value.toString().toUpperCase()));
                    break;
                case "driverLicense":
                    user.setDriverLicense((String) value);
                    break;
                case "driverLicenseCategory":
                    user.setDriverLicenseCategory((String) value);
                    break;
                case "driverLicenseExpiration":
                    user.setDriverLicenseExpiration(LocalDate.parse(value.toString()));
                    break;
                case "birthDate":
                    user.setBirthDate(LocalDate.parse(value.toString()));
                    break;
                case "isActive":
                    user.setIsActive((Boolean) value);
                    break;
                case "photo":
                    user.setPhoto((String) value);
                    break;
                case "password":
                    user.setPassword(passwordEncoder.encode((String) value));
                    break;
                default:
                    break;
            }
        });

        return repository.save(user);
    }

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username}")
    private String mailFrom;

    public void requestPasswordReset(String email) {
        User user = repository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new RuntimeException("E-mail não encontrado."));

        // Altera a senha diretamente sem usar Token de confirmação
        user.setPassword(passwordEncoder.encode("Troca123"));
        repository.save(user);

        org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Recuperação de Senha - IPEM");
        message.setText("Olá,\n\nSua senha foi redefinida com sucesso.\n\n" +
                "Sua nova senha de acesso é: Troca123\n\n" +
                "Recomendamos que você a altere após o login.");

        mailSender.send(message);
    }

    @Transactional
    public void confirmPasswordReset(String token) {
        String email = tokenService.getResetSubject(token);
        if (email == null) {
            throw new RuntimeException("Token inválido ou expirado.");
        }

        User user = repository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));

        user.setPassword(passwordEncoder.encode("Troca123"));
        repository.save(user);
    }
}