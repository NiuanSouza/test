package com.ipem.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.net.Socket;
import java.net.URI;

@SpringBootApplication
public class ApiApplication {

    public static void main(String[] args) {
        if (!isDatabaseReachable()) {
            System.out.println("=========================================================");
            System.out.println("⚠️ MySQL (Docker/Aiven) não detectado na porta especificada!");
            System.out.println("🔄 Ativando automaticamente o profile H2 (Banco em Memória)...");
            System.out.println("=========================================================");
            System.setProperty("spring.profiles.active", "h2");
        }
        SpringApplication.run(ApiApplication.class, args);
    }

    private static boolean isDatabaseReachable() {
        String dbUrl = System.getenv("DB_URL");
        if (dbUrl == null || dbUrl.isEmpty()) {
            dbUrl = "jdbc:mysql://localhost:3307/ipem_db";
        }

        try {
            String cleanUri = dbUrl.replaceFirst("jdbc:", "");
            URI uri = new URI(cleanUri);

            String host = uri.getHost();
            int port = uri.getPort();

            if (host == null)
                return false;
            if (port == -1)
                port = 3306;

            try (Socket socket = new Socket()) {
                socket.connect(new java.net.InetSocketAddress(host, port), 2000); // 2 segundos timeout
                return true;
            }
        } catch (Exception e) {
            return false;
        }
    }
}