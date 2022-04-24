/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('schools', function (table) {
        table.increments('school_id')
        table.string('school_name').notNullable()
        table.string('school_database').notNullable()
    })
}


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('schools')
}
