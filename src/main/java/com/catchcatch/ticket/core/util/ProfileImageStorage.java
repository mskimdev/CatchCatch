package com.catchcatch.ticket.core.util;

import com.catchcatch.ticket.core.errors.BadRequestException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Component
public class ProfileImageStorage {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private final Path profileDirectory = Path.of("uploads", "profiles").toAbsolutePath().normalize();

    public String save(MultipartFile file) {
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

    public void delete(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/uploads/profiles/")) return;
        try {
            Files.deleteIfExists(profileDirectory.resolve(Path.of(imageUrl).getFileName().toString()));
        } catch (IOException ignored) {
        }
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) return "";
        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
