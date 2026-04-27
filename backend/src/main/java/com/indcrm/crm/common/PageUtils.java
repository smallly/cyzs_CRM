package com.indcrm.crm.common;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class PageUtils {
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 200;

    private PageUtils() {
    }

    public static boolean isPagingRequested(Integer page, Integer size) {
        return page != null || size != null;
    }

    public static int normalizePage(Integer page) {
        if (page == null || page < 1) {
            return 1;
        }
        return page;
    }

    public static int normalizeSize(Integer size) {
        if (size == null || size < 1) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }

    public static <T> PageResult<T> paginate(List<T> source, Integer page, Integer size) {
        int normalizedPage = normalizePage(page);
        int normalizedSize = normalizeSize(size);
        int total = source == null ? 0 : source.size();

        if (total == 0) {
            return new PageResult<>(Collections.emptyList(), 0, normalizedPage, normalizedSize);
        }

        int from = (normalizedPage - 1) * normalizedSize;
        if (from >= total) {
            return new PageResult<>(Collections.emptyList(), total, normalizedPage, normalizedSize);
        }
        int to = Math.min(from + normalizedSize, total);
        return new PageResult<>(new ArrayList<>(source.subList(from, to)), total, normalizedPage, normalizedSize);
    }

    public static <T> Object maybePaginate(List<T> source, Integer page, Integer size) {
        if (!isPagingRequested(page, size)) {
            return source;
        }
        return paginate(source, page, size);
    }
}

