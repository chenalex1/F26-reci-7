# Reflection

**Name / Andrew ID: Alex Chen**

**Recitation group members (Task 2): N/A (did this solo)**

---

### 1. Valid but weak

Pick a property you wrote that passes on the correct implementation but
kills few or no mutants. Why is it still a *valid* property? Describe a
concrete bug (not one of our mutants) that it *would* catch.

One property that I wrote that passes on the correct implementation but kills 
few or no mutants is the property that an empty list returns an empty list. 
This is still a valid property because it's a part of the spec, and a bug 
that it would catch would be if the empty list for some reason ended up returning 
literally anything else.

### 2. A generator problem, not a property problem

Describe a mutant, from either task, that survived or was flaky because of
your **generator** rather than your property. What did the generator fail to
produce? How did you fix it? Paste the runner output from before and after.

A mutant that was flaky because of my generator was the one from wordle where 
it never credits more for a letter than it should. The generator failed to 
produce outputs where there were multiple instances of a letter. I fixed this 
by having a targeted generator only generate variations/permutations of the 
secret word. 

Output before:   
```
  ~ singlePass     flaky: killed in 4/5 runs  by: never credits a letter more times than the secret contains it
      Counterexample: ["AABAA","ABBAA"]
      AssertionError: expected 2 to be less than or equal to 1
```

Output after: 
```
  ✔ singlePass     killed  by: never credits a letter more times than the secret contains it
      Counterexample: [["AAAAP","AAAPP"]]
      AssertionError: expected 2 to be less than or equal to 1
```

### 3. Reading a counterexample

Paste one counterexample that the mutation runner printed for a killed
mutant. In 2–3 sentences, explain using the *specification* why that input
exposes the bug.

Counterexample:
```
  ✔ greensOnly     killed  by: a permutation of the secret has no blacks
      Counterexample: [["AAABA","BAAAA"]]
      AssertionError: expected [ 'B', 'G', 'G', 'B', 'G' ] to not include 'B'
```
This input exposes the bug because it allows for the checker to make sure that 
nothing in the output can be the wrong color. Essentially, having something that 
is just a permutation of the secret word allows for the bug where a black could 
appear where it shouldn't to actually be caught.

### 4. Your project

Name one function or module in your team's project that would benefit from
property-based testing. State two properties in English, name the pattern of
each, and describe the generator you'd need, including anything about its
inputs that a naive generator would get wrong.

One module in my team's project that would benefit from property-based testing is 
my newly created persistent memory feature, specifically the reading and 
writing of the memory to disk. One property is that all output files should 
start with mem_, and this would be an invariant. I would need to generate a bunch 
of random memory files, and I would then need to check that each memory file's 
file name follows a mem_* format. Another property that I would check for is 
that each memory file itself is formatted correctly. Again, I would likely have 
to have a targeted generator that generates outputs in specific forms (since it's 
unlikely that a random set of strings would follow the proper format), and then 
check to see if it follows a particular form. This would be an invariant.
