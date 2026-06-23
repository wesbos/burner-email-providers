#!/usr/bin/env ruby
require "json"

dir = __dir__

old_emails = File.readlines(File.join(dir, "emails.txt.old"), chomp: true)
new_domains = JSON.parse(File.read(File.join(dir, "index.json")))

merged = (old_emails + new_domains)
  .map(&:strip)
  .reject(&:empty?)
  .uniq
  .sort

output_path = File.join(dir, "..", "emails.txt")
File.write(output_path, merged.join("\n") + "\n")

puts "Old count: #{old_emails.size}"
puts "New count: #{new_domains.size}"
puts "Merged count: #{merged.size}"
puts "Written to: #{output_path}"
