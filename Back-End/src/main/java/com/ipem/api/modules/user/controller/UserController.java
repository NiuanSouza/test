package com.ipem.api.modules.user.controller;

import com.ipem.api.infrastructure.security.TokenService;
import com.ipem.api.modules.user.dto.*;
import com.ipem.api.modules.user.model.User;
import com.ipem.api.modules.user.model.enums.Permission;
import com.ipem.api.modules.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/user")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService service;
    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;

    public UserController(UserService service, AuthenticationManager authenticationManager, TokenService tokenService) {
        this.service = service;
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid LoginDTO data) {
        try {
            var authenticationToken = new UsernamePasswordAuthenticationToken(data.registration(), data.password());
            var authentication = authenticationManager.authenticate(authenticationToken);

            var user = (User) authentication.getPrincipal();
            var tokenJWT = tokenService.generateToken(user);

            return ResponseEntity.ok(Map.of(
                    "token", tokenJWT,
                    "registration", user.getRegistration(),
                    "permission", user.getPermission().name(),
                    "name", user.getName()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Matrícula ou senha incorretos.");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody @Valid RegisterDTO data) {
        try {
            User newUser = service.registerUser(data);
            return ResponseEntity.status(HttpStatus.CREATED).body(newUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequestDTO data) {
        try {
            service.requestPasswordReset(data.email());
            return ResponseEntity.ok(Map.of("message", "E-mail de recuperação enviado com sucesso. Verifique sua caixa de entrada."));
        } catch (org.springframework.mail.MailAuthenticationException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro de autenticação no servidor de e-mail (SMTP). Verifique a senha ou crie uma Senha de Aplicativo."));
        } catch (org.springframework.mail.MailException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao enviar o e-mail de recuperação: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password-confirm")
    public ResponseEntity<?> confirmPasswordReset(@RequestBody Map<String, String> data) {
        try {
            String token = data.get("token");
            service.confirmPasswordReset(token);
            return ResponseEntity.ok(Map.of("message", "Senha alterada para 'Troca123' com sucesso."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{registration}")
    public ResponseEntity<?> getUserByRegistration(@PathVariable String registration) {
        try {
            User user = service.findByRegistration(registration);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Usuário não encontrado: " + e.getMessage()));
        }
    }

    @PatchMapping("/update/{registration}")
    public ResponseEntity<?> update(@PathVariable String registration,
                                    @RequestBody Map<String, Object> updates) {
        try {
            User updatedUser = service.updateUserFields(registration, updates);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Erro ao atualizar: " + e.getMessage()));
        }
    }

    @GetMapping("/technicians")
    public ResponseEntity<List<User>> listTechnicians() {
        var technicians = service.findAllByPermission(Permission.TECHNICIAN);
        return ResponseEntity.ok(technicians);
    }

    // SOMENTE TÉCNICOS ATIVOS
    @GetMapping("/technicians/active")
    public ResponseEntity<List<User>> listActiveTechnicians() {
        var technicians = service.findActiveTechnicians();
        return ResponseEntity.ok(technicians);
    }

    // Upload de foto
    @PostMapping("/upload-photo/{registration}")
    public ResponseEntity<?> uploadPhoto(
            @PathVariable String registration,
            @RequestParam("foto") MultipartFile foto
    ) {
        try {

            String base64Photo = Base64.getEncoder()
                    .encodeToString(foto.getBytes());

            service.updateUserFields(
                    registration,
                    Map.of("photo", base64Photo)
            );

            return ResponseEntity.ok("Foto atualizada com sucesso");

        } catch (Exception e) {

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // Buscar foto
    @GetMapping("/photo/{registration}")
    public ResponseEntity<?> getPhoto(@PathVariable String registration) {
        try {

            User user = service.findByRegistration(registration);

            if (user == null || user.getPhoto() == null) {
                return ResponseEntity.ok("");
            }

            return ResponseEntity.ok(user.getPhoto());

        } catch (Exception e) {

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}