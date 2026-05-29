package com.catchcatch.ticket.concert;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConcertService {

    private final ConcertRepository concertRepository;


    // homepage
    public List<ConcertResponse.ListDTO> getHomepageConcerts() {


        List<Concert> concertList = concertRepository.findAllByStatusWithFetchJoin(Status.OPEN);

        return concertList.stream()
                .map(concert -> new ConcertResponse.ListDTO(concert))
                .collect(Collectors.toList());
    } // end of getHomepageConcerts


}
