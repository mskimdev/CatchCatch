package com.catchcatch.ticket.core.util;

import org.apache.commons.lang3.StringEscapeUtils;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

public class HtmlSanitizer {

    private static final Safelist EDITOR_SAFELIST = Safelist.relaxed()
            .addAttributes(":all", "style", "class")
            .addTags("s", "u", "sub", "sup");

    public static String sanitize(String html) {
        if (html == null || html.isBlank()) return "";
        return Jsoup.clean(html, EDITOR_SAFELIST);
    }

    public static String escapeHtml(String text) {
        if (text == null) return "";
        return StringEscapeUtils.escapeHtml4(text);
    }

    private HtmlSanitizer() {}
}