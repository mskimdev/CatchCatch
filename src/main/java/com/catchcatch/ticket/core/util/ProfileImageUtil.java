package com.catchcatch.ticket.core.util;

import com.catchcatch.ticket.core.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public class ProfileImageUtil {

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private static final Path profileDirectory = Path.of("uploads", "profiles").toAbsolutePath().normalize();

    public static String save(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("프로필 이미지는 5MB 이하로 업로드해주세요.");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.");
        }

        String filename = UUID.randomUUID() + "." + extension;
        try {
            Files.createDirectories(profileDirectory);
            Files.copy(file.getInputStream(), profileDirectory.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/profiles/" + filename;
        } catch (IOException e) {
            throw new BadRequestException("프로필 이미지를 저장하지 못했습니다.");
        }
    }

    public static String saveFromBase64(String dataUrl) {
        if (dataUrl == null || dataUrl.isBlank()) return null;
        String[] parts = dataUrl.split(",", 2);
        if (parts.length != 2 || !parts[0].startsWith("data:image/")) {
            throw new BadRequestException("이미지 형식이 올바르지 않습니다.");
        }
        String mimeType = parts[0].split(":")[1].split(";")[0];
        String extension = switch (mimeType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> throw new BadRequestException("JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.");
        };
        byte[] imageBytes;
        try {
            imageBytes = Base64.getDecoder().decode(parts[1]);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("이미지 인코딩이 올바르지 않습니다.");
        }
        if (imageBytes.length > MAX_FILE_SIZE) {
            throw new BadRequestException("프로필 이미지는 5MB 이하로 업로드해주세요.");
        }
        String filename = UUID.randomUUID() + "." + extension;
        try {
            Files.createDirectories(profileDirectory);
            Files.write(profileDirectory.resolve(filename), imageBytes);
            return "/uploads/profiles/" + filename;
        } catch (IOException e) {
            throw new BadRequestException("프로필 이미지를 저장하지 못했습니다.");
        }
    }

    public static void delete(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/uploads/profiles/")) return;
        try {
            Files.deleteIfExists(profileDirectory.resolve(Path.of(imageUrl).getFileName().toString()));
        } catch (IOException ignored) {
        }
    }

    private static String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) return "";
        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}