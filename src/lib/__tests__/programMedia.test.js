import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProgramMediaExtension,
  getProgramMediaFileError,
  getProgramMediaFilesError,
  getProgramMediaMimeType,
  MAX_PROGRAM_MEDIA_SIZE,
} from '../programMedia.js';

test('accepts supported photo and video formats and returns lowercase extension', () => {
  const supportedFiles = [
    ['activity.jpg', 'image/jpeg'],
    ['activity.jpeg', 'image/jpeg'],
    ['banner.png', 'image/png'],
    ['cover.webp', 'image/webp'],
    ['clip.mp4', 'video/mp4'],
    ['recording.webm', 'video/webm'],
    ['iphone-video.mov', 'video/quicktime'],
  ];

  supportedFiles.forEach(([name, expectedMime]) => {
    const file = { name, type: expectedMime, size: 1024 * 1024 };
    assert.equal(getProgramMediaFileError(file), '');
    assert.equal(getProgramMediaExtension(file), name.split('.').pop());
    assert.equal(getProgramMediaMimeType(file), expectedMime);
  });
});

test('accepts supported extensions when the browser omits or generalizes the MIME type', () => {
  for (const type of ['', 'application/octet-stream']) {
    const movFile = { name: 'event.mov', type, size: 2048 };
    assert.equal(getProgramMediaFileError(movFile), '');
    assert.equal(getProgramMediaMimeType(movFile), 'video/quicktime');

    const mp4File = { name: 'event.mp4', type, size: 2048 };
    assert.equal(getProgramMediaFileError(mp4File), '');
    assert.equal(getProgramMediaMimeType(mp4File), 'video/mp4');

    const jpgFile = { name: 'event.jpg', type, size: 2048 };
    assert.equal(getProgramMediaFileError(jpgFile), '');
    assert.equal(getProgramMediaMimeType(jpgFile), 'image/jpeg');
  }
});

test('accepts common MIME variants for images and videos', () => {
  assert.equal(
    getProgramMediaFileError({ name: 'photo.jpg', type: 'image/jpg', size: 1024 }),
    '',
  );
  assert.equal(
    getProgramMediaFileError({ name: 'photo.jpg', type: 'image/pjpeg', size: 1024 }),
    '',
  );
  assert.equal(
    getProgramMediaFileError({ name: 'clip.mov', type: 'video/mp4', size: 1024 }),
    '',
  );
});

test('handles uppercase extensions and spaces in filenames', () => {
  const file = { name: 'GROUND BREAKING PHOTO.JPG', type: 'image/jpeg', size: 5000 };
  assert.equal(getProgramMediaFileError(file), '');
  assert.equal(getProgramMediaExtension(file), 'jpg');
  assert.equal(getProgramMediaMimeType(file), 'image/jpeg');
});

test('rejects unsupported extensions, empty files, and oversized files', () => {
  assert.match(
    getProgramMediaFileError({ name: 'report.exe', type: 'application/octet-stream', size: 1024 }),
    /Use a JPG, PNG, WEBP, MP4, WEBM, or MOV file/,
  );
  assert.match(
    getProgramMediaFileError({ name: 'document.pdf', type: 'application/pdf', size: 1024 }),
    /Use a JPG, PNG, WEBP, MP4, WEBM, or MOV file/,
  );
  assert.match(
    getProgramMediaFileError({ name: 'photo.jpg', type: 'image/jpeg', size: 0 }),
    /smaller than 50 MB/,
  );
  assert.match(
    getProgramMediaFileError({ name: 'photo.jpg', type: 'image/jpeg', size: MAX_PROGRAM_MEDIA_SIZE + 1 }),
    /smaller than 50 MB/,
  );
  assert.equal(
    getProgramMediaFileError({ name: 'photo.jpg', type: 'image/jpeg', size: MAX_PROGRAM_MEDIA_SIZE }),
    '',
  );
});

test('getProgramMediaFilesError validates multiple files and formats errors', () => {
  assert.equal(getProgramMediaFilesError([]), 'Choose at least one photo or video to upload.');
  assert.equal(getProgramMediaFilesError(null), 'Choose at least one photo or video to upload.');

  const validFiles = [
    { name: 'photo1.jpg', type: 'image/jpeg', size: 1024 },
    { name: 'photo2.png', type: 'image/png', size: 2048 },
  ];
  assert.equal(getProgramMediaFilesError(validFiles), '');

  const mixedFiles = [
    { name: 'photo1.jpg', type: 'image/jpeg', size: 1024 },
    { name: 'document.pdf', type: 'application/pdf', size: 2048 },
  ];
  assert.match(getProgramMediaFilesError(mixedFiles), /document\.pdf: Use a JPG/);
});
