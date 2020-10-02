#!/usr/bin/python3

from tldextract import TLDExtract

# cache locally, where we can write files
no_fetch_extract = TLDExtract(cache_file='./.tld_cache')

def main():
    provider_file = open("emails.txt", 'r')

    provider_domains = []
    all_good = True
    for line in provider_file.readlines():
        provider_domain = line.rstrip()
        if provider_domain in provider_domains:
            print('Duplicate entry: {}'.format(provider_domain))
            all_good = False
        if provider_domains:
            previous_domain = provider_domains[-1]
            current_order = [previous_domain, provider_domain]
            if sorted(current_order) != current_order:
                print('Wrong sorting: {} after {}'.format(
                    provider_domain,
                    previous_domain,
                ))
                all_good = False
            domain_parts = no_fetch_extract(provider_domain)
            if not (domain_parts.domain and domain_parts.suffix):
                all_good = False
                print('Not a valid domain: {} ({})'.format(
                    provider_domain,
                    domain_parts,
                ))
        provider_domains.append(provider_domain)

    if not all_good:
        exit(1)


if __name__ == '__main__':
    main()
