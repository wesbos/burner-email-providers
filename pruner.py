#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prune burner list removing domains with no MX records.

$ pip3 install dnspython

$ python3 mx_check.py
"""
import functools
import urllib.request

import dns.resolver
import dns.exception


def fetch_url(url):
    """Naive URL fetch."""
    fp = urllib.request.urlopen(url)
    s = fp.read().decode("utf8")
    return s


@functools.lru_cache()
def get_burner_email_domains():
    """Using well maintained list of burner domains.
    This will drop Mailinator etc and all.
    """
    url = "https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt"
    s = fetch_url(url)
    return s.split('\n')


@functools.lru_cache(maxsize=None)
def is_working_email_domain(domain):
    """Check whether domain has valid MX records,
    if not it can not receive email.
    """
    try:
        mx_records = dns.resolver.query(domain, 'MX')
    except (dns.resolver.NXDOMAIN,
            dns.resolver.NoAnswer,
            dns.resolver.NoNameservers,
            dns.exception.Timeout):
        return False
    mxs = [x.to_text() for x in mx_records]
    if mxs:
        return True
    return False


def prune():
    to_remove = []
    burner_domains = get_burner_email_domains()
    print('Domains to remove:')
    for domain in burner_domains:
        if not is_working_email_domain(domain):
            print('    ', domain)
            to_remove.append(domain)

    new_list = [x for x in burner_domains if x not in to_remove]
    print('Removed %s old domains, new valid list:' % len(to_remove))
    print()
    print('\n'.join(new_list))


if __name__ == '__main__':
    prune()

