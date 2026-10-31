<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public const DEFAULT_CONSENT = 'Ako ay pumapayag na maglaro ng Tala-Salitaan. Alam kong ang aking mga sagot ay titingnan ng aking guro upang matulungan akong matuto ng mga bagong salita.';

    /** Public: the CONCENT screen is shown before anyone logs in. */
    public function consent(): JsonResponse
    {
        return response()->json([
            'consent_text' => AppSetting::get(AppSetting::CONSENT_TEXT, self::DEFAULT_CONSENT),
        ])->header('Cache-Control', 'public, max-age=300');
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'consent_text' => AppSetting::get(AppSetting::CONSENT_TEXT, self::DEFAULT_CONSENT),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'consent_text' => ['required', 'string', 'max:5000'],
        ]);
        AppSetting::put(AppSetting::CONSENT_TEXT, $data['consent_text']);

        return $this->show();
    }
}
