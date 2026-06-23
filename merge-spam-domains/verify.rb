#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"

dir = __dir__
old_path = File.join(dir, "emails.txt.old")
json_path = File.join(dir, "index.json")
final_path = File.join(dir, "..", "emails.txt")

old_domains = File.readlines(old_path, chomp: true).reject { |line| line.strip.empty? }
json_domains = JSON.parse(File.read(json_path))
final_lines = File.readlines(final_path, chomp: true)

failures = 0

# Check 1: Every non-blank domain in emails.txt.old is present in final emails.txt
final_set = final_lines.to_set
missing_old = old_domains.reject { |domain| final_set.include?(domain) }
if missing_old.empty?
  puts "PASS: All #{old_domains.size} domains from emails.txt.old are present in emails.txt"
else
  puts "FAIL: #{missing_old.size} domains from emails.txt.old are missing from emails.txt"
  missing_old.each { |d| puts "  missing: #{d}" }
  failures += 1
end

# Check 2: Every domain in index.json is present in final emails.txt
missing_json = json_domains.reject { |domain| final_set.include?(domain) }
if missing_json.empty?
  puts "PASS: All #{json_domains.size} domains from index.json are present in emails.txt"
else
  puts "FAIL: #{missing_json.size} domains from index.json are missing from emails.txt"
  missing_json.each { |d| puts "  missing: #{d}" }
  failures += 1
end

# Check 3: No duplicate lines in final emails.txt
duplicates = final_lines.tally.select { |_, count| count > 1 }
if duplicates.empty?
  puts "PASS: No duplicate lines in emails.txt (#{final_lines.size} total lines)"
else
  puts "FAIL: #{duplicates.size} duplicated entries found in emails.txt"
  duplicates.each { |d, count| puts "  #{d} appears #{count} times" }
  failures += 1
end

# Check 4: emails.txt is sorted alphabetically (case-sensitive)
sorted = final_lines == final_lines.sort
if sorted
  puts "PASS: emails.txt is sorted alphabetically (case-sensitive)"
else
  out_of_order = final_lines.each_cons(2).select { |a, b| (a <=> b) > 0 }
  puts "FAIL: emails.txt is not sorted alphabetically (#{out_of_order.size} out-of-order pairs)"
  out_of_order.first(5).each { |a, b| puts "  #{a.inspect} should come after #{b.inspect}" }
  failures += 1
end

# Check 5: No blank lines in final emails.txt
blank_lines = final_lines.each_with_index.select { |line, _| line.strip.empty? }
if blank_lines.empty?
  puts "PASS: No blank lines in emails.txt"
else
  puts "FAIL: #{blank_lines.size} blank lines found in emails.txt"
  blank_lines.first(5).each { |_, i| puts "  line #{i + 1}" }
  failures += 1
end

if failures > 0
  puts "\n#{failures} check(s) FAILED"
  exit 1
else
  puts "\nAll checks passed"
  exit 0
end
