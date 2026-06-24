package com.catchcatch.ticket.review;

import jakarta.validation.constraints.*;

public class ReviewRequest {

    public record SaveDTO(

            @NotNull(message = "평점을 입력해주세요")
            @DecimalMin(value = "0.5",message = "평점은 최소 0.5점 이상이어야 합니다.")
            @DecimalMax(value = "5.0", message = "평점은 최대 5.0점까지만 가능합니다.")
            Double rating,

            @NotBlank(message = "리뷰 내용을 입력해주세요")
            @Size(max = 1000, message = "리뷰 내용은 1000자를 초과할 수 없습니다.")
            String content
    ){}

    public record UpdateDTO(
            @NotNull(message = "평점을 입력해주세요")
            @DecimalMin(value = "0.5",message = "평점은 최소 0.5점 이상이어야 합니다.")
            @DecimalMax(value = "5.0", message = "평점은 최대 5.0점까지만 가능합니다.")
            Double rating,

            @NotBlank(message = "리뷰 내용을 입력해주세요")
            @Size(max = 1000, message = "리뷰 내용은 1000자를 초과할 수 없습니다.")
            String content
    ){}
}
