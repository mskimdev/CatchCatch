package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    public List<NoticeResponse.ListDTO> findAll() {
        List<Notice> notices = noticeRepository.findAllByOrderByIsPinnedDescCreatedAtDesc();

        long nonPinnedTotal = notices.stream().filter(n -> !n.isPinned()).count();
        int[] counter = {(int) nonPinnedTotal};

        return notices.stream()
                .map(notice -> {
                    int num = notice.isPinned() ? 0 : counter[0]--;
                    return new NoticeResponse.ListDTO(notice, num);
                })
                .toList();
    }

    public NoticeResponse.DetailDTO findById(Integer id){
        Notice notice = noticeRepository.findById(id).orElseThrow(
                () -> new NotFoundException("해당하는 공지사항을 찾을 수 없습니다.")
        );

        return new NoticeResponse.DetailDTO(notice);
    }

    @Transactional
    public void save(NoticeRequest.SaveDTO reqDTO, Integer userId) {
        User user = userRepository.findById(userId).orElseThrow(
                () -> new NotFoundException("유저를 찾을 수 없습니다.")
        );

        Notice notice = reqDTO.toEntity();
        notice.setUser(user);
        noticeRepository.save(notice);
    }

}
