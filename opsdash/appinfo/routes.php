<?php
return [
  'routes' => [
    // Canonical URLs under /overview. Keep names aligned to the controller.
    ['name' => 'overview#index',          'url' => '/overview',                'verb' => 'GET'],
    ['name' => 'overview#load',           'url' => '/overview/load',           'verb' => 'GET'],
    ['name' => 'overview#loadData',       'url' => '/overview/load',           'verb' => 'POST'],
    ['name' => 'persist#persist',         'url' => '/overview/persist',        'verb' => 'POST'],
    ['name' => 'notes#notes',             'url' => '/overview/notes',          'verb' => 'GET'],
    ['name' => 'notes#notesSave',         'url' => '/overview/notes',          'verb' => 'POST'],
    ['name' => 'overview#ping',           'url' => '/overview/ping',           'verb' => 'GET'],
    ['name' => 'presets#presetsList',    'url' => '/overview/presets',        'verb' => 'GET'],
    ['name' => 'presets#presetsSave',    'url' => '/overview/presets',        'verb' => 'POST'],
    ['name' => 'presets#presetsLoad',    'url' => '/overview/presets/{name}', 'verb' => 'GET'],
    ['name' => 'presets#presetsDelete',  'url' => '/overview/presets/{name}', 'verb' => 'DELETE'],
    ['name' => 'deck#boards',            'url' => '/overview/deck/boards',    'verb' => 'GET'],
    ['name' => 'deck#cards',             'url' => '/overview/deck/cards',     'verb' => 'GET'],
    ['name' => 'report#testSend',        'url' => '/overview/report/test-send', 'verb' => 'POST'],
  ],
];
