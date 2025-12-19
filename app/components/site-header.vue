<template>
<div>
  <nav class="navbar is-primary py-1" role="navigation" aria-label="main navigation">
    <div class="container">
      <div class="navbar-brand has-text-weight-bold">
        <NuxtLink class="navbar-item" to="/">
          <img src="/images/logo-dark.svg" alt="Logo">
          AI Receipts POC
        </NuxtLink>

        <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navbarBasicExample">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>

      <div id="navbarBasicExample" class="navbar-menu">
        <div class="navbar-start">
          <NuxtLink to="/blobs" class="navbar-item">
            Blobs
          </NuxtLink>
          <NuxtLink to="/samples" class="navbar-item">
            Samples (local)
          </NuxtLink>
        </div>
        <div class="navbar-end">
        </div>
      </div>
    </div>
  </nav>
</div>
</template>
