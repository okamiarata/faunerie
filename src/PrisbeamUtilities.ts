export class PrisbeamUtilities {
    static timeAgo(time: number | Date | string) {
        if (!isNaN(parseInt(time as string))) {
            time = new Date(time).getTime();
        }

        let periods = ["second", "minute", "hour", "day", "week", "month", "year", "age"];

        let lengths = [60, 60, 24, 7, 4.35, 12, 100];

        let now = new Date().getTime();

        let difference = Math.round((now - (time as number)) / 1000);
        let tense: string;
        let period: string;

        if (difference <= 10 && difference >= 0) {
            return "now";
        } else if (difference > 0) {
            tense = "ago";
        } else {
            tense = "later";
        }

        let j: number;

        for (j = 0; difference >= lengths[j] && j < lengths.length - 1; j++) {
            difference /= lengths[j];
        }

        difference = Math.round(difference);

        period = periods[j];

        return `${difference} ${period}${difference > 1 ? "s" : ""} ${tense}`;
    }

    static formatSize(size: number) {
        let sizeString: string;

        if (size > 1024 ** 3) {
            sizeString = (size / 1024 ** 3).toFixed(1) + " GB";
        } else if (size > 1024 ** 2) {
            sizeString = (size / 1024 ** 2).toFixed(1) + " MB";
        } else if (size > 1024) {
            sizeString = (size / 1024).toFixed(0) + " KB";
        } else {
            sizeString = size + " B";
        }

        return sizeString ?? size;
    }

    static getMimeBadge(type: string) {
        switch (type) {
            case "image/gif":
                return `<span style='float: right; margin-right: 10px; font-size: 1rem; margin-top: 5px;' class='badge bg-danger'>GIF</span>`;

            case "image/jpeg":
                return `<span style='float: right; margin-right: 10px; font-size: 1rem; margin-top: 5px;' class='badge bg-warning'>JPEG</span>`;

            case "image/png":
                return `<span style='float: right; margin-right: 10px; font-size: 1rem; margin-top: 5px;' class='badge bg-primary'>PNG</span>`;

            case "image/svg+xml":
                return `<span style='float: right; margin-right: 10px; font-size: 1rem; margin-top: 5px;' class='badge bg-light'>SVG</span>`;

            case "video/webm":
                return `<span style='float: right; margin-right: 10px; font-size: 1rem; margin-top: 5px;' class='badge bg-info'>WebM</span>`;

            default:
                return `<span style='float: right; margin-right: 10px; font-size: 1rem; margin-top: 5px;' class='badge bg-secondary'>Unknown</span>`;
        }
    }
}
