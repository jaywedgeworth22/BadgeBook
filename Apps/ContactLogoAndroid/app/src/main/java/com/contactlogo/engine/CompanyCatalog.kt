package com.contactlogo.engine

import java.util.Locale

object CompanyCatalog {
    private val domains = mapOf(
        "apple" to "apple.com", "apple inc" to "apple.com",
        "google" to "google.com", "alphabet" to "google.com",
        "microsoft" to "microsoft.com", "amazon" to "amazon.com",
        "meta" to "meta.com", "facebook" to "facebook.com", "instagram" to "instagram.com",
        "netflix" to "netflix.com", "spotify" to "spotify.com", "uber" to "uber.com",
        "lyft" to "lyft.com", "airbnb" to "airbnb.com", "door dash" to "doordash.com",
        "doordash" to "doordash.com", "instacart" to "instacart.com",
        "walmart" to "walmart.com", "target" to "target.com", "costco" to "costco.com",
        "home depot" to "homedepot.com", "the home depot" to "homedepot.com",
        "lowes" to "lowes.com", "lowe's" to "lowes.com",
        "starbucks" to "starbucks.com", "mcdonalds" to "mcdonalds.com",
        "mcdonald's" to "mcdonalds.com", "chick fil a" to "chick-fil-a.com",
        "chick-fil-a" to "chick-fil-a.com", "chipotle" to "chipotle.com",
        "delta" to "delta.com", "delta air lines" to "delta.com",
        "united" to "united.com", "united airlines" to "united.com",
        "american airlines" to "aa.com", "southwest" to "southwest.com",
        "southwest airlines" to "southwest.com",
        "chase" to "chase.com", "jpmorgan" to "jpmorganchase.com",
        "bank of america" to "bankofamerica.com", "bofa" to "bankofamerica.com",
        "wells fargo" to "wellsfargo.com", "citi" to "citi.com", "citibank" to "citi.com",
        "american express" to "americanexpress.com", "amex" to "americanexpress.com",
        "capital one" to "capitalone.com", "discover" to "discover.com",
        "charles schwab" to "schwab.com", "schwab" to "schwab.com",
        "fidelity" to "fidelity.com", "vanguard" to "vanguard.com",
        "progressive" to "progressive.com", "geico" to "geico.com",
        "state farm" to "statefarm.com", "allstate" to "allstate.com",
        "at&t" to "att.com", "att" to "att.com", "verizon" to "verizon.com",
        "t-mobile" to "t-mobile.com", "tmobile" to "t-mobile.com",
        "comcast" to "xfinity.com", "xfinity" to "xfinity.com", "spectrum" to "spectrum.com",
        "fedex" to "fedex.com", "ups" to "ups.com", "usps" to "usps.com",
        "heb" to "heb.com", "h-e-b" to "heb.com", "kroger" to "kroger.com",
        "publix" to "publix.com", "walgreens" to "walgreens.com", "cvs" to "cvs.com",
        "trader joes" to "traderjoes.com", "trader joe's" to "traderjoes.com",
        "aldi" to "aldi.us", "whole foods" to "wholefoodsmarket.com",
        "kaiser" to "kp.org", "kaiser permanente" to "kp.org",
        "quest" to "questdiagnostics.com", "quest diagnostics" to "questdiagnostics.com",
        "labcorp" to "labcorp.com", "enterprise" to "enterprise.com",
        "hertz" to "hertz.com", "avis" to "avis.com",
        "shell" to "shell.com", "chevron" to "chevron.com",
        "exxon" to "exxon.com", "bp" to "bp.com", "7-eleven" to "7-eleven.com",
        "wawa" to "wawa.com", "buc-ees" to "buc-ees.com"
    )

    fun domainForName(name: String): String? {
        val key = Normalize.companyKey(name)
        domains[key]?.let { return it }

        // Strip location tails
        val cleaned = Normalize.cleanName(name)
        val cleanedKey = Normalize.companyKey(cleaned)
        domains[cleanedKey]?.let { return it }

        return null
    }
}
