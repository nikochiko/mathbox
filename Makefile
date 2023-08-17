.PHONY: build deploy run

DOMAINS = "mathbox.kaustubh.page"

build:
	pnpm run build

deploy: build
	for domain in $(DOMAINS); do \
		rsync -a --delete --backup --backup-dir=/var/www/$$domain.backup ./build/ personal-droplet:/var/www/$$domain; \
	done

run:
	pnpm run dev
