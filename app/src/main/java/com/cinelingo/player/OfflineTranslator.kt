package com.cinelingo.player

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions

/** On-device translation (Google ML Kit). Needs internet only once per language to download the model. */
object OfflineTranslator {

    fun langCode(name: String): String? = when (name) {
        "Telugu" -> TranslateLanguage.TELUGU
        "Hindi" -> TranslateLanguage.HINDI
        "Tamil" -> TranslateLanguage.TAMIL
        "Kannada" -> TranslateLanguage.KANNADA
        "English" -> TranslateLanguage.ENGLISH
        "Spanish" -> TranslateLanguage.SPANISH
        "French" -> TranslateLanguage.FRENCH
        "Japanese" -> TranslateLanguage.JAPANESE
        "Korean" -> TranslateLanguage.KOREAN
        else -> null // ML Kit has no Malayalam model
    }

    fun detectSource(sample: String, onResult: (String) -> Unit) {
        LanguageIdentification.getClient().identifyLanguage(sample.take(600))
            .addOnSuccessListener { tag ->
                val code = if (tag == "und") null else TranslateLanguage.fromLanguageTag(tag)
                onResult(code ?: TranslateLanguage.ENGLISH)
            }
            .addOnFailureListener { onResult(TranslateLanguage.ENGLISH) }
    }

    fun getTranslator(source: String, target: String): Translator =
        Translation.getClient(
            TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(target).build()
        )

    fun prepare(translator: Translator, onReady: () -> Unit, onError: (String) -> Unit) {
        translator.downloadModelIfNeeded(DownloadConditions.Builder().build())
            .addOnSuccessListener { onReady() }
            .addOnFailureListener { onError(it.message ?: "model download failed") }
    }

    fun translateList(
        translator: Translator,
        texts: List<String>,
        onProgress: (Int) -> Unit,
        onDone: (List<String>) -> Unit,
        onError: (String) -> Unit
    ) {
        val out = ArrayList<String>(texts.size)
        fun next(i: Int) {
            if (i >= texts.size) {
                onDone(out)
                return
            }
            translator.translate(texts[i])
                .addOnSuccessListener {
                    out.add(it)
                    if (i % 10 == 0) onProgress(i)
                    next(i + 1)
                }
                .addOnFailureListener { onError(it.message ?: "translation failed") }
        }
        next(0)
    }
}
