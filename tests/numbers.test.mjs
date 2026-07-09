import { test } from "node:test";
import assert from "node:assert/strict";
import {
	numToHanzi,
	priceToHanzi,
	timeToHanzi,
	dateToHanzi,
} from "../js/numbers.js";

test("numToHanzi: basic tens", () => {
	assert.equal(numToHanzi(0), "零");
	assert.equal(numToHanzi(10), "十");
	assert.equal(numToHanzi(11), "十一");
	assert.equal(numToHanzi(26), "二十六");
	assert.equal(numToHanzi(99), "九十九");
});

test("numToHanzi: hundreds with zero and 两", () => {
	assert.equal(numToHanzi(100), "一百");
	assert.equal(numToHanzi(105), "一百零五");
	assert.equal(numToHanzi(115), "一百一十五");
	assert.equal(numToHanzi(250), "两百五十");
	assert.equal(numToHanzi(399), "三百九十九");
});

test("numToHanzi: thousands", () => {
	assert.equal(numToHanzi(1205), "一千二百零五");
	assert.equal(numToHanzi(2191), "两千一百九十一");
});

test("priceToHanzi", () => {
	assert.equal(priceToHanzi(5, 5), "五块五毛");
	assert.equal(priceToHanzi(16, 0), "十六块");
});

test("timeToHanzi", () => {
	assert.equal(timeToHanzi(7, 0), "七点");
	assert.equal(timeToHanzi(12, 15), "十二点一刻");
	assert.equal(timeToHanzi(8, 30), "八点半");
	assert.equal(timeToHanzi(2, 45), "两点三刻");
	assert.equal(timeToHanzi(9, 5), "九点零五分");
});

test("dateToHanzi", () => {
	assert.equal(dateToHanzi(10, 25), "十月二十五号");
});
