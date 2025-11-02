<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $table = 'employees';
    protected $primaryKey = 'NIP_BARU';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'NIP',
        'NIP_BARU',
        'NAMA_LENGKAP',
        'KODE_PANGKAT',
        'GOL_RUANG',
        'pangkat_asn',
        'TMT_PANGKAT',
        'MK_TAHUN',
        'MK_BULAN',
        'KODE_SATUAN_KERJA',
        'SATUAN_KERJA',
        'KODE_JABATAN',
        'KET_JABATAN',
        'TMT_JABATAN',
        'NAMA_SEKOLAH',
        'KODE_JENJANG_PENDIDIKAN',
        'JENJANG_PENDIDIKAN',
        'AKTA',
        'FAKULTAS_PENDIDIKAN',
        'JURUSAN',
        'TAHUN_LULUS',
        'TGL_LAHIR',
        'TEMPAT_LAHIR',
        'ISI_UNIT_KERJA',
        'kab_kota',
        'TMT_PENSIUN',
        'tmt_cpns',
    ];

    protected $casts = [
        'TMT_PENSIUN' => 'date',
        'TMT_PANGKAT' => 'date',
        'TMT_JABATAN' => 'date',
        'TGL_LAHIR' => 'date',
        'tmt_cpns' => 'date',
    ];
}
