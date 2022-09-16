CREATE MIGRATION m15wgtyzxss6up2w5r764lcsyi4lqnag6x4uni2wkzhkl2wvm4mzaa
    ONTO m1l4v6tzxg7v7yju25xaja4ix5ifhvklez3wfomokxzgvtnvytwvma
{
  CREATE TYPE default::Example {
      CREATE REQUIRED PROPERTY message -> std::str;
  };
};
